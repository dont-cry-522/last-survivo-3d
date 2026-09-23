import{test}from'node:test';import assert from'node:assert/strict';import{experienceNeeded,grantExperience,seeded,weaponFor,chooseUpgrades}from'../rules.js';
test('experience preserves every pending level',()=>{const p={level:1,xp:0,pending:0,hp:30,maxHp:100};grantExperience(p,100);assert(p.level>2);assert.equal(p.pending,p.level-1);assert(p.xp<experienceNeeded(p.level));});
test('random layouts reproducible',()=>{const a=seeded(42),b=seeded(42);for(let i=0;i<20;i++)assert.equal(a(),b());});
test('hero weapons are distinct',()=>{assert.equal(weaponFor('silver',0).id,'crossbow');assert.equal(weaponFor('scout',0).id,'rifle');});
test('choices are distinct and exclude maxed upgrades',()=>{const p={upgrades:{power:5}};for(let i=0;i<20;i++){const c=chooseUpgrades(p);assert.equal(c.length,3);assert.equal(new Set(c.map(x=>x.id)).size,3);assert(!c.some(x=>x.id==='power'));}});
