// Sites become eligible over the run, but only local exploration reveals their identity.
export const DISCOVERY_RADIUS=16;
export function siteSchedule(site,index,random=Math.random){
 if(site.type==='relic')return 0;
 if(site.event==='ambush')return 60+random()*15;
 if(site.event)return 28+random()*12;
 return index>=3?90+random()*15:12+random()*8;
}
export function discoverSite(site,time,x,z){
 if(site.discovered)return false;
 if(time<(site.availableAt||0)||Math.hypot(x-site.x,z-site.z)>DISCOVERY_RADIUS)return false;
 site.discovered=true;site.reveal=0;return true;
}
