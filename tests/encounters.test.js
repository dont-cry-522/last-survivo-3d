import{test}from'node:test';import assert from'node:assert/strict';
import{encounterPhase,enemyGrowth,encounterRole,enemyApproach,separation,attackSlotAvailable,HUNT_SQUAD}from'../encounters.js';
import{experienceNeeded,grantExperience}from'../rules.js';
test('each hunt has advance warning and recovery, with bounded pressure even after three minutes',()=>{
 for(const t of [42,96,150]){assert.equal(encounterPhase(t).mode,'warning');assert.equal(encounterPhase(t).remaining,5);assert.equal(encounterPhase(t+5).mode,'assault');assert.equal(encounterPhase(t+20).mode,'rest');assert.equal(encounterPhase(t+20).interval,Infinity);}
 for(let t=0;t<900;t++){assert(encounterPhase(t).cap<=30);assert(encounterPhase(t).interval>=1.25);assert.equal(encounterPhase(t,true).mode,'boss');assert.equal(encounterPhase(t,true).cap,14);}
 assert(encounterRole(16,()=>.9)==='wolf');assert(encounterRole(36,()=>.9)==='spitter');
 assert(HUNT_SQUAD.some(s=>s.elite)&&HUNT_SQUAD.filter(s=>s.role==='wolf').length===2);
 assert(Math.max(...HUNT_SQUAD.map(s=>s.offset))-Math.min(...HUNT_SQUAD.map(s=>s.offset))<Math.PI,'formation leaves an escape side');
});
test('opening takes more than four mushrooms, later progress avoids quadratic costs and keeps all surplus XP',()=>{
 assert(experienceNeeded(1)>6*4);assert(experienceNeeded(10)<115);assert(experienceNeeded(15)<202);
 for(const xp of [6,8,23]){const early=enemyGrowth(0,xp),late=enemyGrowth(180,xp);assert(late.xp/early.xp>late.health);assert.deepEqual(enemyGrowth(240,xp),enemyGrowth(900,xp));}
 const p={level:1,xp:0,pending:0,hp:100,maxHp:100};grantExperience(p,999);let total=p.xp;for(let l=1;l<p.level;l++)total+=experienceNeeded(l);assert.equal(total,999);assert.equal(p.pending,p.level-1);
});
test('flankers separate, casters shelter or retreat, and offscreen casters approach instead of orbiting',()=>{
 const p={x:0,z:0},left={id:1,alive:true,role:'wolf',x:0,z:9,packAngle:0,flank:-1,size:.6},right={...left,id:2,flank:1};
 assert(enemyApproach(left,p,[],true).x<0&&enemyApproach(right,p,[],true).x>0);
 const tank={id:3,alive:true,role:'golem',x:0,z:5,size:1},mage={id:4,alive:true,role:'spitter',x:0,z:8,size:.6};
 assert(enemyApproach(mage,p,[tank],true).z>tank.z);assert.equal(enemyApproach(mage,p,[tank],false).z,0);
 assert(enemyApproach({...mage,z:3},p,[],true).z>3);
 const crowded={...mage,x:.15};assert(separation(mage,[mage,crowded]).x<0);assert(Math.hypot(...Object.values(separation(mage,[mage,crowded])))<=.65);
});
test('crowds retain separate melee and ranged attack slots and release slots when interrupted or dead',()=>{
 const caster={role:'spitter'},near=[{role:'spitter',alive:true,wind:.3},{role:'shaman',alive:true,wind:.5}];
 assert(!attackSlotAvailable(caster,near));near[0].wind=0;assert(attackSlotAvailable(caster,near));
 const melee=Array.from({length:3},()=>({role:'wolf',alive:true,pounce:.2}));assert(!attackSlotAvailable({role:'golem'},melee));melee[0].alive=false;assert(attackSlotAvailable({role:'golem'},melee));assert(attackSlotAvailable(caster,melee));
});
