// A fixed-size minimap grid keeps exploration cost independent of world size.
export const EXPLORATION_SIZE=128;
export const EXPLORATION_RADIUS=20;
export function createExploration(half,mode='explore'){
 const size=EXPLORATION_SIZE,cells=new Uint8Array(size*size),scale=size/(half*2);
 let count=0,revision=0;
 return {half,mode,cells,get count(){return count;},get revision(){return revision;},
  get percent(){return Math.floor(count/cells.length*100);},
  reveal(x,z){
   if(mode!=='explore'||!Number.isFinite(x)||!Number.isFinite(z))return;
   const cx=(x+half)*scale,cz=(z+half)*scale,r=EXPLORATION_RADIUS*scale;
   let changed=false;
   for(let j=Math.max(0,Math.floor(cz-r));j<Math.min(size,Math.ceil(cz+r));j++)
    for(let i=Math.max(0,Math.floor(cx-r));i<Math.min(size,Math.ceil(cx+r));i++){
     const k=j*size+i;
     if(!cells[k]&&(i+.5-cx)**2+(j+.5-cz)**2<=r*r){cells[k]=1;count++;changed=true;}
    }
   if(changed)revision++;
  },
  known(x,z){
   if(x < -half||x > half||z < -half||z > half||!Number.isFinite(x)||!Number.isFinite(z))return false;
   if(mode==='visible')return true;
   const i=Math.min(size-1,Math.floor((x+half)*scale)),j=Math.min(size-1,Math.floor((z+half)*scale));
   return cells[j*size+i]===1;
  }
 };
}
