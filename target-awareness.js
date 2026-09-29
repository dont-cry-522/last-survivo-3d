export const playerHidden=p=>p.heroId==='tide'&&p.dashTime>0;
// Store coordinates, never the live player object: submerged motion must not leak into pursuit.
export function observePlayer(observer,player,dt=0){
 observer.reacquired=false;
 if(!playerHidden(player)){
  observer.reacquired=!!observer.targetLost;observer.targetLost=false;observer.searchTime=0;
  observer.lastSeenPlayer={x:player.x,z:player.z,vx:0,vz:0};return player;
 }
 if(!observer.targetLost){observer.searchHeading=observer.mesh?.rotation.y||0;observer.searchTime=0;}
 observer.targetLost=true;observer.searchTime=(observer.searchTime||0)+dt;
 return observer.lastSeenPlayer||{x:observer.x,z:observer.z,vx:0,vz:0};
}
