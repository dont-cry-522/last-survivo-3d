import * as T from './vendor/three.module.js';

// One curved blade is used both in the hand and in flight.
const crescent=new T.Shape();
crescent.moveTo(-.12,.32);
crescent.bezierCurveTo(.43,.22,.45,-.28,-.12,-.33);
crescent.bezierCurveTo(.17,-.17,.18,.15,-.12,.32);
crescent.closePath();
export const shadowCrescentEdge=new T.CubicBezierCurve(new T.Vector2(-.12,.32),new T.Vector2(.43,.22),new T.Vector2(.45,-.28),new T.Vector2(-.12,-.33)).getPoints(24);
export const shadowCrescentGeometry=new T.ExtrudeGeometry(crescent,{depth:.025,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.008,curveSegments:20});
