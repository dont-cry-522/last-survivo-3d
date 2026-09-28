// One clock drives travel, the skeletal action, landing and gameplay hooks.
export const HERO_DODGES={guardian:{duration:1.2,distance:0,cooldown:4.2,name:'铁壁'},tide:{duration:2,distance:0,cooldown:6.5,name:'潜潮'},lingya:{duration:.58,distance:6.2,cooldown:3.6,name:'换位'}};
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
export function heroDodgePose(kind,remaining){
 const cfg=HERO_DODGES[kind];if(!cfg)return null;const u=clamp(1-remaining/cfg.duration),weight=smooth(0,.12,u)*(1-smooth(.80,1,u));
 if(kind==='tide'){const depth=smooth(0,.18,cfg.duration-remaining)*smooth(0,.22,remaining);return{u,weight:depth,depth,height:depth?-2.15*depth:0,brace:.15*depth};}
 if(kind==='guardian')return{u,weight,depth:0,height:0,brace:weight*.16};
 const launch=1-smooth(.20,.34,u),land=smooth(.61,.76,u),air=1-launch-land;
 return{u,weight,launch,air,land,startTime:Math.min(.20,u/.25*.20),airTime:Math.max(0,u-.25)*.4,landTime:clamp((u-.61)/.39)*.94,
  height:kind==='guardian'||u<=.18||u>=.76?0:Math.sin(Math.PI*clamp((u-.18)/.58))*(kind==='lingya'?.16:.10),brace:weight*(kind==='guardian'?.22:.13)};
}
export function dodgeTravel(kind,remaining){const c=HERO_DODGES[kind],u=clamp(1-remaining/c.duration);return c.distance*(u-Math.sin(2*Math.PI*u)/(2*Math.PI));}

export const HERO_ABILITY_TEXT={
 guardian:'按闪避键举盾 1.2 秒，可缓慢移动，正面伤害降低 75%；最初 0.18 秒精准格挡可强化下一次重击。侧后方仍会受伤，收盾推开面前普通怪物。基础冷却 4.2 秒。',
 tide:'按闪避键潜入召来的潮水，最多 2 秒无敌，可控制移动但不能攻击，也不能穿过障碍。再次按闪避键或松开后重新攻击可提前浮出。基础冷却 6.5 秒，自动攻击不会自动取消潜潮。',
 lingya:'伙伴存活、相距 4—9 米且路径畅通时，按闪避键向伙伴方向侧跃（最远 6.2 米），伙伴跑向你的起点，撤离最初 0.45 秒免伤。伙伴倒地、太近、太远或路径被挡时，改用普通燕步。基础冷却 3.6 秒。'
};
