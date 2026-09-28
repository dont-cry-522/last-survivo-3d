// Simulation time only: warnings precede stronger quicksand, then a long recovery window.
export function sandWeather(time){const phase=((time%38)+38)%38,warning=phase>=18&&phase<21,active=phase>=21&&phase<29;return{warning,active,strength:active?Math.min(1,(phase-21)/1.5,(29-phase)/1.5):0,label:warning?'沙暴将至 · 离开深色流沙':active?'沙暴 · 流沙更黏滞，踏石路通行':'风息 · 可以挖掘古匣'};}
