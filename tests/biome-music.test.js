import{test}from'node:test';import assert from'node:assert/strict';
import{BIOME_THEMES,scoreBiome,instrumentSample,biomeThreat}from'../biome-music.js';

test('full adventure phrases remain in key, leave breathing room and resolve before looping',()=>{
 const scale=new Set([0,2,4,5,7,9,11]);
 for(const theme of Object.values(BIOME_THEMES)){
  assert.equal(theme.bars.length,16);
  for(const {chord,lead}of theme.bars){
   assert.equal(lead.length,theme.meter);assert(lead.some(n=>n===null));
   for(const n of [...chord,...lead.filter(n=>n!==null)])assert(scale.has(n%12),'out-of-key note '+n);
   assert(chord.some(n=>n%12===lead[0]%12),'downbeat lacks harmonic support');
  }
  assert.deepEqual(theme.bars.at(-1).chord,[0,4,7]);assert.equal(theme.bars.at(-1).lead[0],12);
  for(const pressure of[0,.45,1]){
   let calls=0;const api={musicNote:(kind,n,d,v,t,pan)=>{assert([n,d,v,t,pan].every(Number.isFinite));assert(d>0&&d<1.8);assert(v>0&&v<.3);calls++;},voice:()=>{},noise:()=>{}};
   const step=60/(theme.bpm+pressure*18)/2;
   for(let b=0;b<theme.bars.length*theme.meter*2;b++)scoreBiome(api,theme,b,b*step,step,pressure);
   assert(calls>100);
  }
 }
});

test('wind melody has stable tuning instead of large frequency wobble',()=>{
 for(const kind of['reed','flute'])for(const note of[62,74,79]){
  const rate=22050,s=instrumentSample(kind,note,rate),expected=440*2**((note-69)/12),crossings=[];
  for(let i=Math.floor(rate*.35);i<rate*1.3;i++)if(s[i-1]<0&&s[i]>=0)crossings.push(i-1-s[i-1]/(s[i]-s[i-1]));
  for(let i=6;i<crossings.length;i++){
   const measured=rate*6/(crossings[i]-crossings[i-6]);
   assert(Math.abs(1200*Math.log2(measured/expected))<12,kind+' excessive pitch wobble');
  }
 }
});

test('combat adds rhythm but preserves melody; warning uses current harmony',()=>{
 for(const theme of Object.values(BIOME_THEMES)){
  const gather=pressure=>{const notes=[],noises=[];const api={musicNote:(...n)=>notes.push(n),voice:()=>{},noise:(...n)=>noises.push(n)};
   for(let beat=0;beat<theme.meter*16;beat++)scoreBiome(api,theme,beat,beat*.25,.25,pressure);
   return{lead:notes.filter(n=>['reed','flute'].includes(n[0])),notes,noises};};
  const calm=gather(0),combat=gather(1);assert.deepEqual(calm.lead,combat.lead);assert(combat.notes.length>calm.notes.length);assert(combat.noises.length>calm.noises.length);
  const pitches=[];biomeThreat({musicNote:(k,n)=>pitches.push(n),voice:()=>{},noise:()=>{}},theme,theme.meter*5+1,0,true);
  assert.deepEqual(pitches,theme.bars[5].chord.map(n=>n+theme.root));
 }
});
