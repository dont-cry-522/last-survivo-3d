import{test}from'node:test';
import assert from'node:assert/strict';
import{newHeroAttack}from'../new-hero-motion.js';
test('new attacks peak at actual thrust and boomerang release, including haste',()=>{
 for(const[kind,max,fraction]of[['tide',.48,.34],['lingya',.55,.24]])for(const period of[.25,.5,1]){
  const duration=Math.min(max,Math.max(.12,period*.9)),hit=newHeroAttack(kind,duration*fraction,period);
  assert.equal(hit.drive,1);assert.equal(hit.wind,0);assert.equal(newHeroAttack(kind,0,period).weight,0);assert.equal(newHeroAttack(kind,period,period).weight,0);
  for(let i=0;i<=200;i++)for(const v of Object.values(newHeroAttack(kind,i/200*period,period)))assert(Number.isFinite(v)&&v>=0&&v<=1);
 }
});
