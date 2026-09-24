// Shared timing keeps the visible roll and its ground travel in sync.
export const SCOUT_ROLL_DURATION=.52;
export const SCOUT_ROLL_DISTANCE=4.8;
export function rollProgress(remaining){return Math.max(0,Math.min(1,1-remaining/SCOUT_ROLL_DURATION));}
export function rollTravel(remaining){const p=rollProgress(remaining);return SCOUT_ROLL_DISTANCE*(p-Math.sin(p*Math.PI*2)/(Math.PI*2));}
export function rollWeight(remaining){const p=rollProgress(remaining),smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};return smooth(p/.12)*(1-smooth((p-.82)/.18));}
