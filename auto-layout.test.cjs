const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const layout=require('./auto-layout.js'),R=require('./routing.js');
const ctx={window:{HarnessRouting:R},document:{querySelector:()=>({}),querySelectorAll:()=>[]},console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8').replace('  init();','  window.test={lightBeeSample,pinPosition,nodeHeight};'),ctx);
const {lightBeeSample,pinPosition,nodeHeight}=ctx.window.test;
for(const sample of [lightBeeSample]){
  const s=sample(),before=s.wires.map(w=>[w.id,w.from,w.to,w.color]);
  layout.arrange(s.nodes,s.wires,nodeHeight);
  for(let i=0;i<s.nodes.length;i++)for(let j=i+1;j<s.nodes.length;j++){
    const a=s.nodes[i],b=s.nodes[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+nodeHeight(a)<=b.y||b.y+nodeHeight(b)<=a.y,'Boxes overlap');
  }
  const start=Date.now(),failed=layout.route(s.nodes,s.wires,pinPosition,nodeHeight);
  assert.equal(failed.length,0,'Unrouted wires');assert.deepEqual(s.wires.map(w=>[w.id,w.from,w.to,w.color]),before);
  const pins=new Map(s.nodes.flatMap(n=>n.pins.map(p=>[p.id,pinPosition(n,p)])));
  s.wires.forEach(w=>{
    const pts=[pins.get(w.from),...w.waypoints,pins.get(w.to)];
    pts.slice(1).forEach((b,i)=>{
      const a=pts[i];assert.ok(a.x===b.x||a.y===b.y,'Diagonal segment');
      s.nodes.forEach(n=>assert.ok(!(a.x===b.x?a.x>n.x+.01&&a.x<n.x+n.width-.01&&Math.max(a.y,b.y)>n.y+.01&&Math.min(a.y,b.y)<n.y+nodeHeight(n)-.01:a.y>n.y+.01&&a.y<n.y+nodeHeight(n)-.01&&Math.max(a.x,b.x)>n.x+.01&&Math.min(a.x,b.x)<n.x+n.width-.01),'Wire through box'));
    });
  });
  console.log(`${s.project.name}: ${s.nodes.length} non-overlapping boxes, ${s.wires.length} orthogonal routes, ${Date.now()-start}ms; connections preserved`);
}
const variants=new Set();
for(const mode of ['rows','columns','hub'])for(let seed=0;seed<6;seed++){
  const s=lightBeeSample(),endpoints=JSON.stringify(s.wires.map(w=>[w.from,w.to]));
  layout.compact(s.nodes,s.wires,nodeHeight,mode,seed);
  for(let i=0;i<s.nodes.length;i++)for(let j=i+1;j<s.nodes.length;j++){const a=s.nodes[i],b=s.nodes[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+nodeHeight(a)<=b.y||b.y+nodeHeight(b)<=a.y,`${mode} overlaps`);}
  assert.equal(JSON.stringify(s.wires.map(w=>[w.from,w.to])),endpoints);
  variants.add(JSON.stringify(s.nodes.map(n=>[n.x,n.y])));
}
assert.ok(variants.size>6);
console.log(`PASS: 18 compact layout runs; ${variants.size} distinct arrangements, no box overlaps or rewiring`);
// Audit intentional crossing and overlap independently of the path finder.
const probeNodes=[{pins:[{id:'a',x:0,y:50},{id:'b',x:100,y:50},{id:'c',x:50,y:0},{id:'d',x:50,y:100},{id:'e',x:20,y:50},{id:'f',x:80,y:50}],x:1000,y:1000,width:10,height:10}];
const locate=(n,p)=>({x:p.x,y:p.y});
assert.equal(layout.assess(probeNodes,[{from:'a',to:'b'},{from:'c',to:'d'}],locate,n=>n.height).crossings,1);
assert.equal(layout.assess(probeNodes,[{from:'a',to:'b'},{from:'e',to:'f'}],locate,n=>n.height).overlaps,1);
for(const mode of ['balanced','shortest','bends','strict']){
  const s=lightBeeSample();layout.arrange(s.nodes,s.wires,nodeHeight);
  const before=JSON.stringify(s.nodes),topology=JSON.stringify(s.wires.map(w=>[w.from,w.to]));
  const failed=layout.route(s.nodes,s.wires,pinPosition,nodeHeight,{mode,attempt:1});
  assert.equal(JSON.stringify(s.nodes),before);assert.equal(JSON.stringify(s.wires.map(w=>[w.from,w.to])),topology);
  const report=layout.assess(s.nodes,s.wires.filter(w=>!failed.includes(w.id)),pinPosition,nodeHeight);assert.equal(report.diagonal,0);
  console.log(`${mode}: ${failed.length} unrouted; ${report.crossings} crossing pairs; ${report.overlaps} overlapping pairs`);
}
