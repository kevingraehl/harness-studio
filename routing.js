(function(root) {
  'use strict';
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  const length=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);
  function at(points,fraction) {
    let remaining=length(points)*Math.max(0,Math.min(1,fraction));
    for(let i=1;i<points.length;i++) {
      const d=distance(points[i-1],points[i]);
      if(remaining<=d&&d>0){const t=remaining/d;return {x:points[i-1].x+t*(points[i].x-points[i-1].x),y:points[i-1].y+t*(points[i].y-points[i-1].y)};}
      remaining-=d;
    }
    return {...points.at(-1)};
  }
  function slice(points,start,end) {
    const total=length(points), result=[at(points,start)];let walked=0;
    points.slice(1).forEach((p,i)=>{walked+=distance(points[i],p);if(walked>total*start&&walked<total*end)result.push({...p});});
    result.push(at(points,end));return result;
  }
  const path=points=>points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
  function closest(points,p) {
    let best={distance:Infinity,index:0,point:points[0]};
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y;
      const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
      const q={x:a.x+t*dx,y:a.y+t*dy},d=distance(p,q);
      if(d<best.distance)best={distance:d,index:i,point:q};
    }
    return best;
  }
  root.HarnessRouting={distance,length,at,slice,path,closest};
  if(typeof module!=='undefined')module.exports=root.HarnessRouting;
})(typeof window==='undefined'?globalThis:window);
