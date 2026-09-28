import{GUARDIAN_DASH}from'./guardian-motion.js?v=61';
export function inMeleeArc(origin,target,angle,range,arc=Math.PI/3){
 const x=target.x-origin.x,z=target.z-origin.z,d=Math.hypot(x,z);
 return d<=range+(target.size||0)*.4&&Math.abs(Math.atan2(Math.sin(Math.atan2(x,z)-angle),Math.cos(Math.atan2(x,z)-angle)))<=arc;
}
export function canParry(player,x,z,window=.18){
 return player.heroId==='guardian'&&player.dashTime>0&&GUARDIAN_DASH.duration-player.dashTime<=window&&inMeleeArc(player,{x,z},player.dashAngle,1000,Math.PI*.36);
}
