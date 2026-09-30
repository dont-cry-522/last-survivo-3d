// A dry island, four tidal reaches and two branching bays. Randomness changes
// their silhouette, not the safety of the spawn, rewards or bridge landings.
export function coastLayout(random,half=96){
 const scale=half/96,angle=Math.floor(random()*4)*Math.PI/2+(random()-.5)*.30,c=Math.cos(angle),s=Math.sin(angle);
 const point=(x,z)=>({x:(c*x+s*z)*scale,z:(-s*x+c*z)*scale});
 const pond=(x,z,rx,rz,a=0)=>({x:x+(random()-.5)*1.4,z:z+(random()-.5)*1.4,rx:rx+(random()-.5)*1.2,rz:rz+(random()-.5)*1.2,angle:a+(random()-.5)*.05});
 const channels=[pond(-27,3,13,34,-.10),pond(-1,-27,35,12,.10),pond(27,2,12,34,.10),pond(0,31,35,11,-.10)];
 const rawPonds=[...channels,pond(-48,-22,23,9,-.37),pond(47,21,23,11,-.31),pond(-49,52,10,7,.30)];
 if(random()>.45)rawPonds.push(pond(12,-58,9,6,-.25));
 const rawBridges=channels.map((p,i)=>({x:p.x,z:p.z,width:(i%2?p.rz:p.rx)*2.9+4,length:[3.4,3.0,3.8,2.8][i],angle:p.angle+(i%2?Math.PI/2:0)}));
 const fords=[0,2].map((index,i)=>{const p=channels[index],offset=i?-10:10;return{...point(p.x+Math.sin(p.angle)*offset,p.z+Math.cos(p.angle)*offset),half:(p.rx*1.4+3)*scale,width:1.5*scale,angle:p.angle+angle};});
 const sites=[[0,0],[53,-52],[-55,-62],[59,57],[-43,72]].map(([x,z])=>point(x+(random()-.5)*2,z+(random()-.5)*2));
 return{
  spawn:point(-64,-51),sites,
  ponds:rawPonds.map(p=>({...point(p.x,p.z),rx:p.rx*scale,rz:p.rz*scale,angle:p.angle+angle})),
  bridges:rawBridges.map(b=>({...point(b.x,b.z),width:b.width*scale,length:b.length*scale,angle:b.angle+angle})),
  fords,
  districts:[[-63,4,'warehouse',0],[57,-26,'dock',Math.PI/2],[-60,33,'wreck',-.45],[-13,66,'beacon',0]].map(([x,z,kind,a])=>({...point(x,z),kind,angle:a+angle})),
  island:{...point(0,0),radius:8*scale},angle
 };
}
