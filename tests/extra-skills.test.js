import{test}from'node:test';import assert from'node:assert/strict';
import{EXTRA_SKILLS}from'../skill-catalog.js';
import{HeroSkills}from'../hero-skills.js';
import{chooseUpgrades,takeUpgrade,UPGRADES}from'../rules.js';
function rig(hero='scout'){
 const p={heroId:hero,x:0,z:0,hp:50,maxHp:120,upgrades:{}},foes=[],events=[];let active=true;
 const api={player:()=>p,foes:()=>foes.filter(e=>e.alive),active:()=>active,blocked:()=>false,damage:(e,n)=>{e.hp-=n;if(e.hp<=0)e.alive=false;},knock:(e,n)=>{e.z+=n;},fx:e=>events.push(e)};
 const skills=new HeroSkills(api);const foe=(x,z)=>{const e={x,z,hp:1000,alive:true,size:.5};foes.push(e);return e;};
 return{p,foes,events,api,skills,foe,advance:(n)=>{for(let t=0;t<n;t+=.02)skills.update(.02);},pause:()=>active=false};
}
test('each hero gains three exclusive, capped skills and can discover one immediately',()=>{
 assert.equal(EXTRA_SKILLS.length,9);assert.equal(new Set(EXTRA_SKILLS.map(s=>s.id)).size,9);
 for(const hero of ['scout','silver','wraith']){
  const own=EXTRA_SKILLS.filter(s=>s.hero===hero);assert.equal(own.length,3);
  const p={heroId:hero,weaponId:hero==='scout'?'rifle':hero==='silver'?'crossbow':'shade',level:2,upgrades:{}};
  for(let i=0;i<50;i++)assert(chooseUpgrades(p).some(s=>own.some(o=>o.id===s.id)));
  for(const s of EXTRA_SKILLS){assert(UPGRADES.some(u=>u.id===s.id));if(s.hero!==hero)assert.equal(takeUpgrade(p,s.id),false);else{for(let i=0;i<3;i++)assert(takeUpgrade(p,s.id));assert.equal(takeUpgrade(p,s.id),false);}}
 }
});
test('mine arms before proximity damage and is consumed only once',()=>{const r=rig();r.p.upgrades.mine=1;const e=r.foe(0,0);r.advance(1.1);assert.equal(e.hp,1000);r.advance(.6);assert.equal(e.hp,968);r.advance(.6);assert.equal(e.hp,968);assert.equal(r.skills.mines.length,0);});
test('volley triggers from attacks, pierces once per projectile, and respects walls',()=>{const r=rig();r.p.upgrades.volley=1;const e=r.foe(0,3);for(let i=0;i<4;i++)r.skills.onShot(0);assert.equal(r.skills.bolts.length,0);r.skills.onShot(0);r.advance(.6);assert(e.hp<1000);const hp=e.hp;r.advance(1);assert.equal(e.hp,hp);r.api.blocked=()=>true;for(let i=0;i<5;i++)r.skills.onShot(0);r.advance(.6);assert.equal(e.hp,hp);});
test('roll counter requires a dodge then one attack and expires',()=>{const r=rig();r.p.upgrades.counter=1;const e=r.foe(0,3);r.skills.onShot(0);assert.equal(e.hp,1000);r.skills.onDodge(.52);r.advance(.53);r.skills.onShot(0);assert.equal(e.hp,974);r.skills.onShot(0);assert.equal(e.hp,974);r.skills.onDodge(.52);r.advance(3);r.skills.onShot(0);assert.equal(e.hp,974);});
test('arrow rain has a delay, three pulses and allows enemies to leave',()=>{const r=rig('silver');r.p.upgrades.rain=1;const e=r.foe(0,4);r.advance(1.1);assert.equal(e.hp,1000);r.advance(1);assert.equal(e.hp,946);const escaped=rig("silver");escaped.p.upgrades.rain=1;const runner=escaped.foe(0,4);escaped.advance(1.1);runner.x=8;escaped.advance(1);assert.equal(runner.hp,1000);});
test('frost trail requires movement and cannot draw a teleport bridge',()=>{const r=rig('silver');r.p.upgrades.trail=1;r.advance(1);assert.equal(r.skills.trails.length,0);for(let i=0;i<16;i++){r.p.z+=.2;r.skills.update(.02);}assert.equal(r.skills.trails.length,1);const e=r.foe(0,1);r.advance(.1);assert(e.slow>0);assert.equal(e.hp,991);r.p.z+=5;r.skills.update(.02);assert.equal(r.skills.trails.length,1);});
test('pursuit marks are per target, capped by a cooldown and spare bosses from roots',()=>{const r=rig('silver');r.p.upgrades.pursuit=1;const e=r.foe(0,4),b=r.foe(2,4);b.boss=true;for(let i=0;i<3;i++)r.skills.onHit(e);r.skills.onHit(b);assert.equal(e.hp,1000);for(let i=0;i<4;i++)r.skills.onHit(e);assert.equal(e.hp,982);assert(e.stagger>0);r.advance(1.3);for(let i=0;i<4;i++)r.skills.onHit(b);assert(b.slow>0);assert(!b.stagger);});
test('shadow echo schedules two attacks, soul heals only nearby kills with a cooldown',()=>{const r=rig('wraith');r.p.upgrades.echo=1;const e=r.foe(0,4);for(let i=0;i<4;i++)r.skills.onShot(0);assert.equal(e.hp,1000);r.advance(1.2);assert.equal(e.hp,958);r.p.upgrades.soul=1;r.skills.onKill({x:20,z:20});assert.equal(r.p.hp,50);r.skills.onKill(e);r.skills.onKill(e);assert.equal(r.p.hp,52);r.advance(1.1);r.p.hp=119;r.skills.onKill(e);assert.equal(r.p.hp,120);});
test('shadow spikes release in order; pause freezes and reset clears pending effects',()=>{const r=rig('wraith');r.p.upgrades.spikes=1;const e=r.foe(0,6);r.advance(1.1);assert.equal(e.hp,1000);r.pause();const pending=JSON.stringify(r.skills.pending);r.advance(1);assert.equal(JSON.stringify(r.skills.pending),pending);r.skills.reset();assert.equal(r.skills.pending.length,0);assert.equal(r.skills.mines.length+r.skills.bolts.length+r.skills.trails.length,0);});

test('spikes hit near, middle and far targets in sequence',()=>{const r=rig('wraith');r.p.upgrades.spikes=1;const a=r.foe(0,2),b=r.foe(0,4),c=r.foe(0,6);r.advance(1.28);assert.equal(a.hp,973);assert.equal(b.hp,1000);assert.equal(c.hp,1000);r.advance(.16);assert.equal(b.hp,973);assert.equal(c.hp,1000);r.advance(.16);assert.equal(c.hp,973);});

test('counter fires on the exact frame the roll ends while attack is held',()=>{const r=rig();r.p.upgrades.counter=1;const e=r.foe(0,3);r.skills.onDodge(.52);r.skills.update(.51);r.skills.onShot(0,.02);assert.equal(e.hp,974);});
