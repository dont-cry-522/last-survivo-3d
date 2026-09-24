// The drawing buffer is independent of CSS pixels: HUD text remains native-resolution.
export function renderPixelRatio(width,height,dpr=1,mobile=false,quality=1){
 const area=Math.max(1,width)*Math.max(1,height),pixels=mobile?1800000:3200000;
 return Math.min(Math.max(.1,dpr),mobile?1.35:1.5,Math.sqrt(pixels/area))*Math.max(.65,Math.min(1,quality));
}

export class RenderBudget{
 constructor(){this.quality=1;this.reset();}
 reset(){this.warmup=1.5;this.elapsed=0;this.frames=0;this.slow=0;this.fast=0;}
 sample(dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.1){this.reset();return false;}
  if(this.warmup>0){this.warmup-=dt;return false;}
  this.elapsed+=dt;this.frames++;if(this.elapsed<1)return false;
  const average=this.elapsed/this.frames;this.elapsed=0;this.frames=0;
  this.slow=average>.024?this.slow+1:0;this.fast=average<.0184?this.fast+1:0;
  let next=this.quality;
  if(this.slow>=2)next=Math.max(.65,this.quality-.1);
  else if(this.fast>=10)next=Math.min(1,this.quality+.05);
  if(Math.abs(next-this.quality)<.001)return false;
  this.quality=Number(next.toFixed(2));this.reset();return true;
 }
}
