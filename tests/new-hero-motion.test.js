import{test}from'node:test';
import assert from'node:assert/strict';
import{newHeroAttack,heroCarryPose,committedWeaponYaw}from'../new-hero-motion.js';
test('new attacks peak at actual thrust and boomerang release, including haste',()=>{
 for(const[kind,max,fraction]of[['tide',.48,.34],['lingya',.55,.24]])for(const period of[.25,.5,1]){
  const duration=Math.min(max,Math.max(.12,period*.9)),hit=newHeroAttack(kind,duration*fraction,period);
  assert.equal(hit.drive,1);assert.equal(hit.wind,0);assert.equal(newHeroAttack(kind,0,period).weight,0);assert.equal(newHeroAttack(kind,period,period).weight,0);
  for(let i=0;i<=200;i++)for(const v of Object.values(newHeroAttack(kind,i/200*period,period)))assert(Number.isFinite(v)&&v>=0&&v<=1);
 }
});
test('committed attacks retain their release direction and ease back to live aim',()=>{
 assert(Math.abs(committedWeaponYaw(0,Math.PI/2,0,1))<1e-9);assert.equal(committedWeaponYaw(0,Math.PI/2,0,0),Math.PI/2);
 assert(committedWeaponYaw(0,Math.PI/2,0,.1)>0);assert.equal(committedWeaponYaw(.5,undefined,undefined,1),.5);
 const across=committedWeaponYaw(0,-3.1,3.1,1);assert(Math.abs(Math.atan2(Math.sin(across-3.1),Math.cos(across-3.1)))<1e-9);
});
test('individual carry motion remains small and settles while standing',()=>{
 const signatures=[];for(const kind of ['guardian','tide','lingya']){const carry=heroCarryPose(kind,1,.25,1,0);signatures.push(carry.hand);for(let i=0;i<600;i++){const p=heroCarryPose(kind,i/60,i/100,1,.5);for(const value of Object.values(p))assert(Number.isFinite(value)&&Math.abs(value)<.1);}assert.equal(heroCarryPose(kind,10,.3,0,0).hand,0);assert(Math.abs(heroCarryPose(kind,1,.25,1,1).hand)<Math.abs(carry.hand));}assert.equal(new Set(signatures).size,3);
});
