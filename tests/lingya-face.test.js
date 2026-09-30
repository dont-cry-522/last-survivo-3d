import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makeLingyaFace,animateLingyaFace,lingyaFaceDepth} from '../lingya-face.js';

test('Lingya has a continuous sculpted face and shallow, outward-facing eyes',()=>{
 const face=makeLingyaFace(),skin=face.getObjectByName('Lingya_face_surface');
 assert(skin.geometry.index.count>10000);
 face.traverse(o=>{if(!o.isMesh)return;assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
  if(o.name==='Lingya_eye_white'||o.name==='Lingya_iris'||o.name==='Lingya_pupil'){
   const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;
   for(let i=0;i<p.count;i++){const gap=p.getZ(i)-lingyaFaceDepth(p.getX(i),p.getY(i));assert(gap>0&&gap<.006,'eye floats or intersects face');assert(n.getZ(i)>=0,'eye faces inward');}
  }
 });
 const bounds=new T.Box3().setFromObject(skin);assert(bounds.getSize(new T.Vector3()).y<.2);
});
test('blinking closes both eyes around their own centers and fully recovers',()=>{
 const face=makeLingyaFace(),source=face.getObjectByName('Lingya_face_surface').geometry.attributes.position.array.slice();
 animateLingyaFace(face,4.35);
 for(const eye of face.userData.blinkEyes){assert(eye.scale.y<.06);assert(Math.abs(eye.userData.centerY*eye.scale.y+eye.position.y-eye.userData.centerY)<1e-8);}
 animateLingyaFace(face,4.6);for(const eye of face.userData.blinkEyes)assert.equal(eye.scale.y,1);
 assert.deepEqual(face.getObjectByName('Lingya_face_surface').geometry.attributes.position.array,source);
});
