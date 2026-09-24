import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS,WEAPON_PATHS,chooseUpgrades,takeUpgrade,weaponStats} from '../rules.js';
const player=(weaponId,level=3)=>({weaponId,level,upgrades:{},hp:50,maxHp:120});
test('all six weapons offer exactly their two routes at level 3',()=>{
  for(const id of Object.keys(WEAPONS)){
    const p=player(id),paths=chooseUpgrades(p,()=>.3).filter(c=>c.category==='weapon');
    assert.equal(paths.length,2);assert(paths.every(c=>WEAPON_PATHS[c.pathId].weapon===id));
    assert(!chooseUpgrades({...p,level:2}).some(c=>c.category==='weapon'));
  }
});
test('shadow weapons keep separate branching upgrades',()=>{for(const id of ['shade','shadowblade']){const p=player(id),options=chooseUpgrades(p,()=>.3).filter(c=>c.category==='weapon');assert.equal(options.length,2);assert(options.every(c=>WEAPON_PATHS[c.pathId].weapon===id));p.level=8;for(const choice of options){const selected=player(id,8);for(let rank=0;rank<3;rank++)assert(takeUpgrade(selected,choice.id));const upgraded=weaponStats(selected);assert.equal(upgraded.id,id);assert.notDeepEqual(upgraded,weaponStats(player(id)));}}});
test('routes are exclusive, gated at levels 3/5/8, and reject foreign upgrades',()=>{
  const p=player('crossbow');assert.equal(takeUpgrade(p,'path:rifle_pierce'),false);
  assert(takeUpgrade(p,'path:crossbow_hunt'));assert.equal(takeUpgrade(p,'path:crossbow_pierce'),false);
  assert.equal(takeUpgrade(p,'path:crossbow_hunt'),false);
  p.level=5;assert(takeUpgrade(p,'path:crossbow_hunt'));p.level=8;assert(takeUpgrade(p,'path:crossbow_hunt'));
  assert.equal(takeUpgrade(p,'path:crossbow_hunt'),false);assert(!chooseUpgrades(p).some(c=>c.category==='weapon'));
});
test('every branch changes its own weapon without changing element or base definitions',()=>{
  const before=JSON.stringify(WEAPONS);
  for(const [id,path] of Object.entries(WEAPON_PATHS)){
    const p=player(path.weapon,8);for(let i=0;i<3;i++)assert(takeUpgrade(p,'path:'+id));
    const stats=weaponStats(p);assert.equal(stats.id,path.weapon);
    for(const key of ['rate','damage','speed','range','count','pierce'])assert(Number.isFinite(stats[key])&&stats[key]>0,`${id} ${key}`);
    assert.notDeepEqual(stats,weaponStats(player(path.weapon)));
  }
  assert.equal(JSON.stringify(WEAPONS),before);
});
test('support skills remain separate from weapon identity and cannot exceed caps',()=>{
  const p=player('fire');assert(takeUpgrade(p,'ice'));assert.equal(weaponStats(p).id,'fire');
  for(let i=0;i<5;i++)takeUpgrade(p,'power');assert.equal(takeUpgrade(p,'power'),false);
  const hp=p.hp;assert(takeUpgrade(p,'vitality'));assert.equal(p.hp,hp+24);
});
