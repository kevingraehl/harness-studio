(function(root){
  'use strict';
  // Layout changes presentation only. Pin IDs and wire endpoints are never rewritten.
  function arrange(nodes,wires,height) {
    const owners=new Map(nodes.flatMap(n=>n.pins.map(p=>[p.id,n])));
    const degree=new Map(nodes.map(n=>[n.id,0]));
    wires.forEach(w=>[w.from,w.to].forEach(p=>{const n=owners.get(p);if(n)degree.set(n.id,degree.get(n.id)+1)}));
    const hub=nodes.find(n=>n.symbol==='controller')||[...nodes].sort((a,b)=>degree.get(b.id)-degree.get(a.id))[0];
    if(!hub)return;
    const others=nodes.filter(n=>n!==hub);
    const bottom=[],top=[];
    others.forEach(n=>(/motor|throttle|hall|phase/i.test(n.name+' '+n.symbol)?bottom:top).push(n));
    if(!bottom.length)bottom.push(...top.splice(Math.ceil(top.length/2)));
    const cols=Math.max(1,Math.ceil(Math.sqrt(others.length*1.8)));
    const cellW=Math.max(300,...others.map(n=>Math.max(n.width||240,n.pins.length*32)+100));
    const cellH=Math.max(260,...others.map(n=>height(n)+170));
    const topRows=Math.ceil(top.length/cols),hubY=topRows*cellH+250;
    hub.width=Math.max(1000,hub.pins.length*64);hub.height=Math.max(180,hub.height||180);
    hub.x=Math.max(0,(cols*cellW-hub.width)/2);hub.y=hubY;
    const place=(list,y)=>list.forEach((n,i)=>{n.width=Math.max(n.width||240,n.pins.length*32);n.x=(i%cols)*cellW+40;n.y=y+Math.floor(i/cols)*cellH;n.height=Math.max(n.height||120,120)});
    place(top,40);place(bottom,hubY+height(hub)+350);
    nodes.forEach(n=>{
      const groups={top:[],bottom:[],left:[],right:[]};
      n.pins.forEach(p=>{
        const peers=wires.filter(w=>w.from===p.id||w.to===p.id).map(w=>owners.get(w.from===p.id?w.to:w.from)).filter(o=>o&&o!==n);
        const target=peers.length?{x:peers.reduce((s,o)=>s+o.x+o.width/2,0)/peers.length,y:peers.reduce((s,o)=>s+o.y+height(o)/2,0)/peers.length}:{x:hub.x+hub.width/2,y:hub.y+height(hub)/2};
        const dy=target.y-(n.y+height(n)/2),dx=target.x-(n.x+n.width/2);
        const side=n===hub?(dy<0?'top':'bottom'):Math.abs(dy)>height(n)/2?(dy<0?'top':'bottom'):(dx<0?'left':'right');
        groups[side].push({p,target});
      });
      Object.entries(groups).forEach(([side,entries])=>{
        entries.sort((a,b)=>['top','bottom'].includes(side)?a.target.x-b.target.x:a.target.y-b.target.y);
        entries.forEach(({p},i)=>Object.assign(p,{side,edgeFraction:(i+1)/(entries.length+1),offsetX:'',offsetY:''}));
      });
    });
  }
  // Sparse rectilinear visibility grid. Block every component body, penalize
  // reused corridors and turns, and report failure instead of crossing a box.
  function route(nodes,wires,pinPosition,height,options={}) {
    const presets={balanced:{bend:60,cross:1500,overlap:4000},shortest:{bend:10,cross:300,overlap:2500},bends:{bend:240,cross:1200,overlap:4000},strict:{bend:60,cross:Infinity,overlap:Infinity}};
    const weights=presets[options.mode]||presets.balanced;
    const pins=new Map(nodes.flatMap(n=>n.pins.map(p=>[p.id,{node:n,pin:p,point:pinPosition(n,p)}])));
    const boxes=nodes.map(n=>({l:n.x-12,r:n.x+n.width+12,t:n.y-12,b:n.y+height(n)+12}));
    const xs=new Set(),ys=new Set();
    const exit=f=>{let side=f.pin.side;if(!['top','bottom','left','right'].includes(side)){const p=f.point,n=f.node;side=[['left',Math.abs(p.x-n.x)],['right',Math.abs(p.x-n.x-n.width)],['top',Math.abs(p.y-n.y)],['bottom',Math.abs(p.y-n.y-height(n))]].sort((a,b)=>a[1]-b[1])[0][0];}const d={top:[0,-24],bottom:[0,24],left:[-24,0],right:[24,0]}[side];return{x:f.point.x+d[0],y:f.point.y+d[1]}};
    boxes.forEach(b=>{[b.l-20,b.r+20].forEach(x=>xs.add(x));[b.t-20,b.b+20].forEach(y=>ys.add(y))});
    pins.forEach(f=>{const p=exit(f);xs.add(p.x);ys.add(p.y);xs.add(f.point.x);ys.add(f.point.y);if(options.channels!==false){xs.add(p.x-16);xs.add(p.x+16);ys.add(p.y-16);ys.add(p.y+16);}});
    const X=[...xs].sort((a,b)=>a-b),Y=[...ys].sort((a,b)=>a-b),nx=X.length;
    const occupied=new Map(),directions=new Map(),failed=[];
    const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
    const blocked=(a,b)=>boxes.some(r=>a.x===b.x?a.x>r.l&&a.x<r.r&&Math.max(a.y,b.y)>r.t&&Math.min(a.y,b.y)<r.b:a.y>r.t&&a.y<r.b&&Math.max(a.x,b.x)>r.l&&Math.min(a.x,b.x)<r.r);
    const cache=new Map();
    const point=i=>({x:X[i%nx],y:Y[Math.floor(i/nx)]});
    const order=[...wires],attempt=options.attempt||0;
    if(attempt){order.push(...order.splice(0,attempt%Math.max(1,order.length)));if(attempt%2)order.reverse();}
    for(const w of order){
      const from=pins.get(w.from),to=pins.get(w.to);if(!from||!to){failed.push(w.id);continue;}
      const a=exit(from),b=exit(to),start=Y.indexOf(a.y)*nx+X.indexOf(a.x),goal=Y.indexOf(b.y)*nx+X.indexOf(b.x);
      const heap=[];
      function push(v){heap.push(v);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=v.f)break;heap[i]=heap[p];i=p;}heap[i]=v;}
      function pop(){const v=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return v;}
      const dist=new Map(),prev=new Map();push({id:start,dir:0,g:0,f:0,key:start*3});dist.set(start*3,0);let end;
      while(heap.length){const cur=pop();if(cur.g!==dist.get(cur.key))continue;if(cur.id===goal){end=cur.key;break;}
        const x=cur.id%nx,y=Math.floor(cur.id/nx),p=point(cur.id);
        for(const [xx,yy,dir] of [[x-1,y,1],[x+1,y,1],[x,y-1,2],[x,y+1,2]]){
          if(xx<0||xx>=nx||yy<0||yy>=Y.length)continue;
          const id=yy*nx+xx,q=point(id),ek=edgeKey(cur.id,id);if(!cache.has(ek))cache.set(ek,blocked(p,q));if(cache.get(ek))continue;
          const overlap=occupied.get(ek)||0,cross=(id!==goal&&id!==start&&directions.has(id))?1:0;
          if(options.mode==='strict'&&(overlap||cross))continue;
          const g=cur.g+Math.abs(p.x-q.x)+Math.abs(p.y-q.y)+(cur.dir&&cur.dir!==dir?weights.bend:0)+(overlap?overlap*weights.overlap:0)+(cross?weights.cross:0),key=id*3+dir;
          if(g>=(dist.get(key)??Infinity))continue;dist.set(key,g);prev.set(key,cur.key);push({id,dir,key,g,f:g+Math.abs(q.x-b.x)+Math.abs(q.y-b.y)});
        }
      }
      if(end===undefined){failed.push(w.id);continue;}
      const ids=[];for(let k=end;k!==undefined;k=prev.get(k))ids.push(Math.floor(k/3));ids.reverse();
      ids.slice(1).forEach((id,i)=>{const key=edgeKey(ids[i],id),axis=point(id).x===point(ids[i]).x?2:1;occupied.set(key,(occupied.get(key)||0)+1);directions.set(id,(directions.get(id)||0)|axis);directions.set(ids[i],(directions.get(ids[i])||0)|axis);});
      for(const [p,q] of [[from.point,a],[b,to.point]]){
        const vertical=p.x===q.x,axis=vertical?2:1,coords=vertical?Y:X,fixed=vertical?X.indexOf(p.x):Y.indexOf(p.y);
        const lo=Math.min(vertical?p.y:p.x,vertical?q.y:q.x),hi=Math.max(vertical?p.y:p.x,vertical?q.y:q.x);let last;
        coords.forEach((v,i)=>{if(v<lo||v>hi)return;const id=vertical?i*nx+fixed:fixed*nx+i;directions.set(id,(directions.get(id)||0)|axis);if(last!==undefined){const key=edgeKey(last,id);occupied.set(key,(occupied.get(key)||0)+1);}last=id;});
      }
      const pts=[from.point,...ids.map(point),to.point],clean=[];
      pts.forEach(p=>{if(clean.length&&p.x===clean.at(-1).x&&p.y===clean.at(-1).y)return;while(clean.length>1){const a=clean.at(-2),b=clean.at(-1);if((a.x===b.x&&b.x===p.x)||(a.y===b.y&&b.y===p.y))clean.pop();else break;}clean.push(p)});
      w.waypoints=clean.slice(1,-1);w.routing='orthogonal';delete w.branch0;delete w.branch1;
    }
    return failed;
  }
  function assess(nodes,wires,pinPosition,height){
    const pins=new Map(nodes.flatMap(n=>n.pins.map(p=>[p.id,pinPosition(n,p)]))),paths=[];
    let length=0,bends=0,diagonal=0,blocked=0;
    wires.forEach(w=>{const a=pins.get(w.from),b=pins.get(w.to);if(!a||!b)return;const pts=[a,...(w.waypoints||[]),b],segments=[];let hit=false;
      pts.slice(1).forEach((q,i)=>{const p=pts[i];if(p.x===q.x&&p.y===q.y)return;const h=p.y===q.y,v=p.x===q.x;if(!h&&!v)diagonal++;length+=Math.abs(p.x-q.x)+Math.abs(p.y-q.y);segments.push({p,q,h});if(nodes.some(n=>h?p.y>n.y+.01&&p.y<n.y+height(n)-.01&&Math.max(p.x,q.x)>n.x+.01&&Math.min(p.x,q.x)<n.x+n.width-.01:v&&p.x>n.x+.01&&p.x<n.x+n.width-.01&&Math.max(p.y,q.y)>n.y+.01&&Math.min(p.y,q.y)<n.y+height(n)-.01))hit=true;});
      bends+=Math.max(0,segments.length-1);if(hit)blocked++;paths.push({w,segments});
    });
    let crossings=0,overlaps=0;
    for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++){
      let cross=false,overlap=false;const shared=[paths[i].w.from,paths[i].w.to].filter(id=>id===paths[j].w.from||id===paths[j].w.to).map(id=>pins.get(id));
      for(const a of paths[i].segments)for(const b of paths[j].segments){
        if(a.h===b.h){const same=a.h?a.p.y===b.p.y:a.p.x===b.p.x;const axis=a.h?'x':'y';if(same&&Math.min(Math.max(a.p[axis],a.q[axis]),Math.max(b.p[axis],b.q[axis]))-Math.max(Math.min(a.p[axis],a.q[axis]),Math.min(b.p[axis],b.q[axis]))>.01)overlap=true;}
        else {const h=a.h?a:b,v=a.h?b:a,p={x:v.p.x,y:h.p.y};if(p.x>=Math.min(h.p.x,h.q.x)&&p.x<=Math.max(h.p.x,h.q.x)&&p.y>=Math.min(v.p.y,v.q.y)&&p.y<=Math.max(v.p.y,v.q.y)&&!shared.some(q=>q.x===p.x&&q.y===p.y))cross=true;}
      }if(cross)crossings++;if(overlap)overlaps++;
    }
    return{length:Math.round(length),bends,crossings,overlaps,blocked,diagonal};
  }
  function compact(nodes,wires,height,mode='rows',seed=0){
    const list=[...nodes];if(!list.length)return;
    // Deterministic alternatives; no random electrical changes.
    if(seed){const shift=seed%list.length;list.push(...list.splice(0,shift));if(seed%2)list.reverse();}
    if(mode==='hub')list.sort((a,b)=>(b.symbol==='controller')-(a.symbol==='controller'));
    const cols=mode==='columns'?Math.max(1,Math.ceil(Math.sqrt(list.length)/1.5)):Math.max(1,Math.ceil(Math.sqrt(list.length)*1.4));
    const gap=100+(seed%3)*25;
    let y=40;
    for(let start=0;start<list.length;start+=cols){const row=list.slice(start,start+cols);let x=40;
      row.forEach(n=>{n.x=x;n.y=y;x+=n.width+gap});y+=Math.max(...row.map(height))+gap;
    }
    if(mode==='hub'){
      const hub=list[0],others=list.slice(1),columns=Math.max(1,Math.ceil(others.length/2));
      const slot=Math.max(280,...others.map(n=>n.width))+gap,topHeight=Math.max(140,...others.map(height));
      hub.x=Math.max(40,(columns*slot-hub.width)/2);hub.y=topHeight+gap+40;
      others.forEach((n,i)=>{n.x=40+(i%columns)*slot;n.y=i<columns?40:hub.y+height(hub)+gap});
    }
    const owner=new Map(nodes.flatMap(n=>n.pins.map(p=>[p.id,n])));
    nodes.forEach(n=>{const sides={left:[],right:[],top:[],bottom:[]};n.pins.forEach(p=>{
      const w=wires.find(w=>w.from===p.id||w.to===p.id),o=w&&owner.get(w.from===p.id?w.to:w.from);
      const dx=o?o.x+o.width/2-n.x-n.width/2:1,dy=o?o.y+height(o)/2-n.y-height(n)/2:0;
      sides[Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'top':'bottom'].push(p);
    });Object.entries(sides).forEach(([side,pins])=>pins.forEach((p,i)=>Object.assign(p,{side,edgeFraction:(i+1)/(pins.length+1),offsetX:'',offsetY:''})));});
  }
  root.HarnessLayout={arrange,route,compact,assess};if(typeof module!=='undefined')module.exports=root.HarnessLayout;
})(typeof window==='undefined'?globalThis:window);
