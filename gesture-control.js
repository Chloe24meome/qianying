import {clamp,handControls} from './engine.js';
export const FINGER_LINKS=[
 {name:'拇指',joint:'球拍转腕',tip:4,chain:[1,2,3,4]},
 {name:'食指',joint:'持拍手抬放 / 收伸',tip:8,chain:[5,6,7,8]},
 {name:'中指',joint:'左手',tip:12,chain:[9,10,11,12]},
 {name:'无名指',joint:'左脚',tip:16,chain:[13,14,15,16]},
 {name:'小指',joint:'右脚',tip:20,chain:[17,18,19,20]}
];
export function fingerFeatures(points){
 const raw=handControls(points);if(!raw)return null;
 const distance=(a,b)=>Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y,(points[a].z||0)-(points[b].z||0));
 const curl=FINGER_LINKS.map(({chain})=>{const total=chain.slice(1).reduce((sum,n,i)=>sum+distance(chain[i],n),0);return clamp((1-distance(chain[0],chain[3])/Math.max(.001,total))/.55,0,1);});
 // Thumb abduction in palm coordinates: captures sideways swings even with a straight thumb.
 const axis={x:points[9].x-points[0].x,y:points[9].y-points[0].y};
 const thumb={x:points[4].x-points[2].x,y:points[4].y-points[2].y};
 const thumbAngle=Math.atan2(thumb.x*axis.y-thumb.y*axis.x,thumb.x*axis.x+thumb.y*axis.y);
 return {...raw,curl,thumbAngle};
}
export class GestureController{
 constructor(){this.reset();}
 reset(){this.baseline=null;this.shadow=null;}
 calibrate(points){const f=fingerFeatures(points);if(!f)return false;this.baseline=f;return true;}
 update(points,scene='solo'){
  const f=fingerFeatures(points);if(!f)return null;if(!this.baseline)this.calibrate(points);
  const b=this.baseline;
  const lift=f.nodes.map((p,i)=>clamp((f.curl[i]-b.curl[i])*2.1+(b.nodes[i].y-p.y)*.65,-.6,2));
  const nodes=f.nodes.map((p,i)=>({
   x:clamp((p.x-b.nodes[i].x)*1.8,-2,2),
   y:i===2?clamp(.7+lift[i]*.7,-.5,1.8):clamp(lift[i],-.4,1.8)
  }));
  let wrist=clamp(f.wrist-b.wrist,-1,1);
  {
   // Index fingertip drives the complete bat-hand trajectory; middle finger lifts the free hand.
   nodes[0]={x:clamp((f.nodes[2].x-b.nodes[2].x)*2,-2,2),y:clamp(lift[2],-.4,1.8)};nodes[2]={x:0,y:.7};
   nodes[4]={x:clamp((f.nodes[1].x-b.nodes[1].x)*2.4-lift[1]*.9,-2,2),y:clamp(lift[1]*1.25,-.6,2)};
   nodes[1]={x:clamp((f.nodes[3].x-b.nodes[3].x)*1.8,-2,2),y:lift[3]};
   nodes[3]={x:clamp((f.nodes[4].x-b.nodes[4].x)*1.8,-2,2),y:lift[4]};
   const angleDelta=Math.atan2(Math.sin(f.thumbAngle-b.thumbAngle),Math.cos(f.thumbAngle-b.thumbAngle));
   wrist=clamp(wrist*.35+angleDelta*2.8+lift[0]*.5,-1,1);
  }
  this.shadow=points.map((p,i)=>({x:this.shadow?this.shadow[i].x+(p.x-this.shadow[i].x)*.85:p.x,y:this.shadow?this.shadow[i].y+(p.y-this.shadow[i].y)*.85:p.y,z:p.z||0}));
  return {...f,gesture:true,nodes,x:clamp(.5+(f.x-b.x)*1.6,0,1),y:clamp(.5+(f.y-b.y)*1.6,0,1),wrist,wristLeft:clamp((f.curl[2]-b.curl[2])*.4,-.5,.5)};
 }
}

// Project tracked hand geometry above its own puppet without exposing the camera image.
export function projectHand(points,actorX){
 const palm=Math.max(.04,Math.hypot(points[0].x-points[9].x,points[0].y-points[9].y));
 const scale=125/palm;
 return points.map(p=>({x:actorX+clamp((points[9].x-p.x)*scale,-170,170),y:clamp(145+(p.y-points[9].y)*scale,35,285)}));
}
