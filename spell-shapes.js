import * as T from './vendor/three.module.js';

// Shared tapered strips: open silhouettes, never full area/range circles.
function strip(sample,steps=24){
 const positions=[],uv=[],indices=[];
 for(let i=0;i<=steps;i++){const t=i/steps,[a,b]=sample(t);positions.push(...a,...b);uv.push(t,0,t,1);if(i<steps){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function spellShapes(){
 const sweep=strip(t=>{const a=-.95+t*1.9,w=Math.sin(Math.PI*t)**.7*.27;return [[Math.sin(a)*(1-w),Math.cos(a)*(1-w),0],[Math.sin(a)*(1+w),Math.cos(a)*(1+w),0]];});
 const crest=strip(t=>{const x=t*2-1,h=Math.sin(Math.PI*t)**.7;return [[x,0,.3*(1-x*x)],[x,h*.8,.3*(1-x*x)-.22*h]];});
 const shard=new T.ConeGeometry(1,2,4).toNonIndexed();shard.translate(0,1,0);const normal=shard.getAttribute('normal'),colors=[];for(let i=0;i<normal.count;i++){const light=.68+.32*Math.max(0,normal.getX(i)*.5+normal.getY(i)*.7+normal.getZ(i)*.5);colors.push(light,light,light);}shard.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 // Curved claw with a broad heel and a pointed tip.
 const claw=strip(t=>{const x=(t-.5)*.6,y=t*1.6,w=Math.sin(Math.PI*t)**.6*.12;return [[x-w,y,Math.sin(t*Math.PI)*.18],[x+w,y,Math.sin(t*Math.PI)*.18]];},16);
 return {sweep,crest,shard,claw};
}
export function streakTexture(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=32;const c=canvas.getContext('2d');
 const g=c.createLinearGradient(0,0,0,32);for(const [t,a]of [[0,0],[.25,.25],[.5,1],[.75,.25],[1,0]])g.addColorStop(t,`rgba(255,255,255,${a})`);
 c.fillStyle=g;c.fillRect(0,0,128,32);c.globalCompositeOperation='destination-in';const fade=c.createLinearGradient(0,0,128,0);for(const [t,a]of [[0,0],[.15,.9],[.65,1],[1,0]])fade.addColorStop(t,`rgba(255,255,255,${a})`);c.fillStyle=fade;c.fillRect(0,0,128,32);return new T.CanvasTexture(canvas);
}
export function crestTexture(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const c=canvas.getContext('2d'),g=c.createLinearGradient(0,0,0,64);
 for(const [t,a]of [[0,.1],[.16,1],[.35,.5],[1,0]])g.addColorStop(t,`rgba(255,255,255,${a})`);c.fillStyle=g;c.fillRect(0,0,128,64);
 c.globalCompositeOperation='destination-in';const mask=c.createLinearGradient(0,0,128,0);for(const [t,a]of [[0,0],[.2,1],[.8,1],[1,0]])mask.addColorStop(t,`rgba(255,255,255,${a})`);c.fillStyle=mask;c.fillRect(0,0,128,64);return new T.CanvasTexture(canvas);
}
