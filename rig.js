import {clamp,solveLimb} from './engine.js';
const rad=d=>d*Math.PI/180;
export const LIMITS={waist:20,neck:25,wrist:70,ankle:32};
export function rotate(p,angle){return {x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle)};}
function chain(root,a,b,l1,l2){const mid={x:root.x+Math.sin(a)*l1,y:root.y+Math.cos(a)*l1};return [root,mid,{x:mid.x+Math.sin(b)*l2,y:mid.y+Math.cos(b)*l2}];}
export function poseFor(control,t,action={},scene='solo',opponent=false,ballY=440){
 if(control?.gesture&&!action.dance)scene='pingpong';
 let f=(control?.fingers||[.65,.9,.9,.65]).map(v=>clamp(v,0,1)), wave=Math.sin((action.wave||0)*Math.PI),kick=Math.sin((action.kick||0)*Math.PI),jump=Math.sin((action.jump||0)*Math.PI)*80;
 if(scene==='pingpong')wave*=wave; // zero velocity at the start/end of a deliberate stroke
 let waist=rad(clamp(((control?.x??.5)-.5)*28+wave*8,-20,20));
 let neck=rad(clamp((.5-(control?.y??.5))*30-wave*7,-25,25));
 const wrist=rad(clamp((control?.wrist||0)*70+wave*12,-70,70));
 const wristLeft=rad(clamp((control?.wristLeft??-(control?.wrist||0)*.7)*70,-70,70));
 let rightUpper=rad(25+f[0]*55+wave*25),rightFlex=rad(10+(1-f[0])*100);
 if(scene==='pingpong'){
  // Aim with the arm; keep the head upright instead of nodding on every shot.
  waist=0;neck=0;
  const aim=opponent?clamp((ballY-330)/200,0,1):(control?.y??.5);
  rightUpper=rad(135-aim*105+wave*12);rightFlex=rad(18+wave*15);
 }
 const leftUpper=rad(-20-f[3]*52),leftFlex=rad(15+(1-f[3])*100);
 let left=chain({x:-26,y:-90},leftUpper,leftUpper+leftFlex,65,65).map(p=>rotate(p,waist));
 let right=chain({x:26,y:-90},rightUpper,rightUpper+rightFlex,68,68).map(p=>rotate(p,waist));
 let thighL=rad(-8+(1-f[2])*48),kneeL=rad(8+(1-f[2])*78);
 let thighR=rad(8+(1-f[1])*50+kick*55),kneeR=rad(clamp(8+(1-f[1])*75-kick*50,5,130));
 let legL=chain({x:-19,y:16},thighL,thighL-kneeL,82,86),legR=chain({x:19,y:16},thighR,thighR-kneeR,82,86);
 const preview=scene==='solo'?action.preview:'stand';
 const dancing=scene==='solo'&&(action.dance||['sleeves','sway','rest'].includes(preview));
 let rootAngle=0,rootY=0,rootX=0;
 if(dancing){
  const beat=t*3.8,liftL=Math.max(0,Math.sin(beat)),liftR=Math.max(0,-Math.sin(beat));
  waist=rad(Math.sin(beat)*9);neck=rad(-Math.sin(beat)*12);
  thighL=rad(-12+liftL*65);kneeL=rad(12+liftL*95);
  thighR=rad(10+liftR*65+kick*40);kneeR=rad(Math.max(5,12+liftR*95-kick*35));
  legL=chain({x:-19,y:16},thighL,thighL-kneeL,82,86);legR=chain({x:19,y:16},thighR,thighR-kneeR,82,86);
  left=chain({x:-26,y:-90},rad(-65+Math.sin(beat)*30),rad(-20+Math.cos(beat)*45),65,65).map(p=>rotate(p,waist));
  right=chain({x:26,y:-90},rad(65+Math.sin(beat)*30),rad(20+Math.cos(beat)*45),68,68).map(p=>rotate(p,waist));
  jump+=Math.max(legL[2].y,legR[2].y)-181;
 }
 if(dancing&&['sleeves','sway','rest'].includes(preview)){
  const beat=t*(preview==='sleeves'?1.5:2.4);
  waist=rad(Math.sin(beat)*5);neck=-waist*.7;jump=0;
  thighL=rad(-5);kneeL=rad(10);thighR=rad(5);kneeR=rad(10);
  if(preview==='sleeves'){
   left=chain({x:-26,y:-90},rad(-90+Math.sin(beat)*45),rad(-115+Math.cos(beat)*50),65,65);
   right=chain({x:26,y:-90},rad(90+Math.sin(beat)*45),rad(115+Math.cos(beat)*50),68,68);
  }else if(preview==='sway'){
   left=chain({x:-26,y:-90},rad(-45+Math.sin(beat)*25),rad(-75+Math.sin(beat+.8)*30),65,65);
   right=chain({x:26,y:-90},rad(45+Math.sin(beat)*25),rad(75+Math.sin(beat+.8)*30),68,68);
   thighL+=rad(Math.sin(beat)*7);thighR+=rad(Math.sin(beat)*7);
  }else{
   const v=clamp((action.previewTime??3)/1.8,0,1),settle=v*v*(3-2*v);
   rootAngle=-Math.PI/2*settle;rootY=120*settle;rootX=60*settle;
   waist=rad(-5)*settle;neck=rad(8)*settle;
   left=chain({x:-26,y:-90},rad(-12-110*settle),rad(-5-155*settle),65,65);
   right=chain({x:26,y:-90},rad(12+20*settle),rad(5-55*settle),68,68);
   thighL=rad(-5-15*settle);kneeL=rad(10+35*settle);
   thighR=rad(5+10*settle);kneeR=rad(10+45*settle);
  }
  left=left.map(p=>rotate(p,waist));right=right.map(p=>rotate(p,waist));
  legL=chain({x:-19,y:16},thighL,thighL-kneeL,82,86);legR=chain({x:19,y:16},thighR,thighR-kneeR,82,86);
  if(preview!=='rest')jump=Math.max(legL[2].y,legR[2].y)-181;
 }
 // Five fingertip-driven control points: left hand, left foot, head, right foot, right hand.
 if(control?.nodes&&!dancing){
  const n=control.nodes;
  neck=rad(clamp(n[2].x*15+(n[2].y-.7)*14-(scene==='pingpong'?waist*180/Math.PI:0),-25,25));
  left=solveLimb(rotate({x:-26,y:-90},waist),{x:-53+n[0].x*24-Math.max(0,n[0].y)*25,y:37-n[0].y*66},65,65,1);
  right=solveLimb(rotate({x:26,y:-90},waist),{x:(scene==='pingpong'?105:48+Math.max(0,n[4].y)*22)+n[4].x*24+wave*18,y:(scene==='pingpong'?-20:38)-n[4].y*66-wave*48},68,68,-1);
  legL=solveLimb({x:-19,y:16},{x:-30+n[1].x*20,y:182-clamp(n[1].y,0,2)*50},82,86,-1);
  legR=solveLimb({x:19,y:16},{x:30+n[3].x*20+kick*50,y:182-clamp(n[3].y,0,2)*50-kick*45},82,86,-1);
  thighL=Math.atan2(legL[1].x-legL[0].x,legL[1].y-legL[0].y);kneeL=thighL-Math.atan2(legL[2].x-legL[1].x,legL[2].y-legL[1].y);
  thighR=Math.atan2(legR[1].x-legR[0].x,legR[1].y-legR[0].y);kneeR=thighR-Math.atan2(legR[2].x-legR[1].x,legR[2].y-legR[1].y);
 }
 const ankleFlexL=0,ankleFlexR=0;
 const ankleL=-(thighL-kneeL)+ankleFlexL,ankleR=-(thighR-kneeR)+ankleFlexR;
 const neckPoint=rotate({x:0,y:-100},waist);
 // The exact same wrist rotation supplies the visible paddle and its collision point.
 const paddleAngle=Math.atan2(right[2].y-right[1].y,right[2].x-right[1].x)-Math.atan2(305,100)+wrist;
 const paddleOffset=rotate({x:35,y:-30},paddleAngle);
 return {jump,rootAngle,rootY,rootX,sway:0,waist,neck,neckPoint,wristL:wristLeft,wristR:wrist,ankleL,ankleR,ankleFlexL,ankleFlexR,left,right,legL,legR,paddleAngle,
  paddle:{x:right[2].x+paddleOffset.x,y:right[2].y+paddleOffset.y},plume:0};
}
export class PlumeSpring{
 constructor(){this.angle=0;this.velocity=0;this.previous=0;}
 update(target,dt){dt=clamp(dt,0,.04);const impulse=clamp(target-this.previous,-.2,.2);this.previous=target;this.velocity+=impulse*6;this.velocity+=(-40*this.angle-7*this.velocity)*dt;this.angle=clamp(this.angle+this.velocity*dt,-.13,.13);return this.angle;}
}
// One hand per fixed screen-side player zone. Never infer a person's identity from handedness.
export function assignHands(hands){
 const zones=[[],[]];
 for(const points of hands||[]){if(points?.length!==21)continue;const x=1-points[9].x;if(x<.46)zones[0].push(points);else if(x>.54)zones[1].push(points);}
 return zones.map(zone=>zone.length===1?zone[0]:null);
}

// The computer chooses a reachable pose; collision uses its visible paddle like a human.
export function aimPaddle(ball,right=true){
 // Continuous height solve. Fixed shoulders remove the old three-position torso switching.
 const sample=y=>{
  const control={x:.5,y,wrist:0,fingers:[.65,.95,.95,.65]},p=poseFor(control,0,{},'pingpong');
  const px=(right?925:310)+(right?-1:1)*p.paddle.x*1.05,py=445+p.paddle.y*1.05;
  const time=clamp((px-ball.x)/(ball.vx||1),0,.55);
  return {control,error:py-(ball.y+ball.vy*time+122.5*time*time)};
 };
 let low=0,high=1;
 for(let i=0;i<16;i++){const mid=(low+high)/2;if(sample(mid).error<0)low=mid;else high=mid;}
 return sample((low+high)/2).control;
}

export function smoothOpponent(current,target,dt){
 const step=clamp(dt,0,.04),blend=1-Math.exp(-7*step);
 const approach=(a,b,rate)=>{const delta=b-a;return Math.abs(delta)<=.008?a:a+clamp((delta-Math.sign(delta)*.008)*blend,-rate*step,rate*step);};
 return {...target,x:approach(current.x,target.x,.3),y:approach(current.y,target.y,.8)};
}

// Hysteresis rejects tracking noise; a speed cap prevents a reacquired head snapping.
export function smoothControlNodes(current,target,dt){
 const step=clamp(dt,0,.04);
 return target.map((p,i)=>{
  const prev=current?.[i]||p,head=i===2,deadband=head?.035:.008;
  const rate=head?1.4:24,blend=1-Math.exp(-(head?10:48)*step);
  const axis=k=>{const delta=p[k]-prev[k];return Math.abs(delta)<=deadband?prev[k]:prev[k]+clamp((delta-Math.sign(delta)*deadband)*blend,-rate*step,rate*step);};
  return {x:axis('x'),y:axis('y')};
 });
}

// Shared world placement for rendering, shadow strings and swept paddle collision.
export function actorPlacement(control,right=false,tracked=false){
 return {x:(right?925:310)+(tracked?clamp((control.x-.5)*260,-90,90):0),
 y:445+(tracked?clamp((control.y-.5)*150,-45,45):0)};
}
export function worldPaddle(pose,placement,right=false){
 return {x:placement.x+(right?-1:1)*pose.paddle.x*1.05,y:placement.y-pose.jump+pose.paddle.y*1.05};
}
