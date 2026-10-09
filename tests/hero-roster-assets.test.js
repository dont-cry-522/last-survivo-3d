import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {CHARACTER_ASSETS as assets} from '../character-assets.js';
import {actor,animateActor} from '../world.js';
const worldURL=new URL('../world.js',import.meta.url),entry=fs.readFileSync(worldURL,'utf8').match(/from['"](.\/skinned-hero\.js[^'"]*)['"]/)[1];
const {loadHeroAssets,createSkinnedHero,animateSkinnedHero,disposeHero}=await import(new URL(entry,worldURL));

test('remaining heroes load and animate without guardian models while retaining shared textures and bosses',async()=>{
 const dir=new URL('../assets/characters/',import.meta.url),textures=new Set();
 assert(!Object.keys(assets.models).some(name=>name.startsWith('guardian-')));
 for(const name of Object.keys(assets.models)){
  const model=JSON.parse(fs.readFileSync(new URL(name+'.gltf',dir)));
  for(const image of model.images||[])textures.add(image.uri);
 }
 assert.deepEqual(new Set(assets.textures),textures,'only textures used by retained models should preload');
 const original=Object.fromEntries(['fetch','self','ProgressEvent','createImageBitmap'].map(key=>[key,globalThis[key]])),requests=[];
 try{
  globalThis.self=globalThis;
  globalThis.ProgressEvent=class{constructor(type,data){Object.assign(this,data);}};
  globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});
  globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url;requests.push(url);return url.startsWith('file:')?new Response(fs.readFileSync(fileURLToPath(url))):original.fetch(input);};
  await loadHeroAssets();
  const checkModel=model=>{let meshes=0;model.updateMatrixWorld(true);model.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh)meshes++;});assert(meshes>0);};
  for(const [kind,weapon]of [['silver','crossbow'],['scout','rifle'],['wraith','shade'],['tide','harpoon'],['lingya','boomerang'],['wuling','sporelantern'],['mirage','miasmalantern']]){
   const hero=createSkinnedHero(kind,weapon);assert.equal(hero.userData.kind,kind);assert(hero.userData.skinned);assert.equal(hero.userData.wraith,undefined);assert(hero.userData.gun);assert(hero.userData.model.skeleton.bones.length>50);
   for(let frame=0;frame<12;frame++)animateSkinnedHero(hero,frame/60,3,0,0);
   checkModel(hero);disposeHero(hero);
  }
  for(const [kind,weapon]of [['wraith','shade'],['boss'],['dunescorpion']]){
   const model=actor(kind,weapon);if(kind==='wraith'){assert.equal(model.userData.skinned,true);assert.equal(model.userData.kind,'wraith');assert.equal(model.userData.wraith,undefined);}for(let frame=0;frame<12;frame++)animateActor(model,frame/60,2);checkModel(model);disposeHero(model);
  }
  assert(!requests.some(url=>url.includes('guardian-')),'removed hero assets still requested');
 }finally{
  for(const [key,value]of Object.entries(original))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
 }
});
