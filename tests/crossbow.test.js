import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../rules.js';
const {weaponFor,weaponStats}=rules;

test('silver hunter starts with a crossbow while other loadouts stay distinct',()=>{
  assert.equal(weaponFor('silver',0).id,'crossbow');
  assert.equal(weaponFor('silver',1).id,'shuriken');
  assert.equal(weaponFor('silver',2).id,'dark');
  assert.equal(weaponFor('scout',0).id,'rifle');
  assert.equal(weaponStats({weaponId:'crossbow',upgrades:{}}).count,1);
});

test('third consecutive bolt to the same target triggers one impact',()=>{
  assert.equal(typeof rules.registerCrossbowHit,'function');
  const player={};
  assert.equal(rules.registerCrossbowHit(player,1,0),false);
  assert.equal(rules.registerCrossbowHit(player,1,.5),false);
  assert.equal(rules.registerCrossbowHit(player,1,1),true);
  assert.equal(rules.registerCrossbowHit(player,1,1.5),false);
  assert.equal(rules.registerCrossbowHit(player,2,2),false);
  assert.equal(rules.registerCrossbowHit(player,1,2.5),false);
  assert.equal(rules.registerCrossbowHit(player,1,6),false);
});

test('hunter mechanism stats match the three upgrade card ranks',()=>{
  const base=weaponStats({weaponId:'crossbow',upgrades:{}});
  for(const [rank,rate,speed] of [[1,1.18,1.10],[2,1.32,1.18],[3,1.46,1.25]]){
    const stat=weaponStats({weaponId:'crossbow',upgrades:{},weaponPath:{id:'crossbow_hunt',rank}});
    assert(Math.abs(stat.rate/base.rate-rate)<.0001);
    assert(Math.abs(stat.speed/base.speed-speed)<.0001);
  }
});
