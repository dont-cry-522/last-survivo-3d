const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
// Four separate footfalls at a walk; a short low bound replaces paddling during a strike.
export function badgerAttack(state,progress){const p=clamp(progress);
 if(state==='wind')return{crouch:smooth(p)*.055,air:0,reach:0,jaw:smooth(p)*.18,impact:0};
 if(state==='pounce')return{crouch:0,air:Math.sin(Math.PI*p)*.17,reach:Math.sin(Math.PI*p),jaw:(1-smooth((p-.48)/.18))*.32,impact:Math.sin(Math.PI*clamp((p-.52)/.3))};
 if(state==='recover')return{crouch:Math.sin(Math.PI*p)*.045,air:0,reach:0,jaw:0,impact:0};
 return{crouch:0,air:0,reach:0,jaw:0,impact:0};
}
export function badgerCadence(speed){return Math.min(4.1,Math.max(0,speed)/(.48+Math.min(1,speed/5)*.55));}
