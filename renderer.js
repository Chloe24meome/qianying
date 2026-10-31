import {FINGER_LINKS,projectHand} from './gesture-control.js';
import {solveLimb,clamp} from './engine.js';
import {TraditionalArtwork} from './artwork.js';
import {poseFor} from './rig.js';
export {poseFor} from './rig.js';
const W=1200,H=780,TAU=Math.PI*2;
function line(c,pts,color,width=1){c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function path(c,d,fill,stroke='#342419',width=1.5){const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p);}}
function dot(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function flower(c,x,y,r,tone='#c79653'){
 c.save();c.translate(x,y);for(let i=0;i<8;i++){c.rotate(TAU/8);c.beginPath();c.ellipse(0,r*.58,r*.18,r*.35,0,0,TAU);c.fillStyle=tone;c.fill();}dot(c,0,0,r*.22,'#412c20');dot(c,0,0,r*.1,'#ddb26b');c.restore();
}
function ornament(c,x,y,r){dot(c,x,y,r,'#4a3020','#c79b59');flower(c,x,y,r*.85);}
function joint(c,p,r=7){dot(c,p.x,p.y,r,'#b3894e','#3c2c1e');dot(c,p.x,p.y,2,'#3b2b1e');}
function segment(c,a,b,width,tone){
 c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2);const len=Math.hypot(b.x-a.x,b.y-a.y);
 path(c,`M ${-width/2} 0 Q ${-width*.7} ${len*.4} ${-width*.36} ${len} Q 0 ${len+5} ${width*.36} ${len} Q ${width*.7} ${len*.4} ${width/2} 0 Z`,tone);
 line(c,[[-width*.32,5],[-width*.24,len-5]],'#c69a5a',1);line(c,[[width*.32,5],[width*.24,len-5]],'#c69a5a',1);
 for(let y=13;y<len-7;y+=14){flower(c,0,y,width*.32);dot(c,-width*.38,y,1.1,'#e4bf7d');dot(c,width*.38,y,1.1,'#e4bf7d');}
 c.restore();
}
function puppet(c,p,t,ping,tone){
 // The rear limbs are painted first; every segment pivots around a shared joint.
 segment(c,p.left[0],p.left[1],24,tone);segment(c,p.left[1],p.left[2],18,tone);
 for(const leg of [p.legL,p.legR]){
  segment(c,leg[0],leg[1],37,tone);segment(c,leg[1],leg[2],26,tone);
  c.save();c.translate(leg[2].x,leg[2].y);path(c,'M -12 -8 L 10 -8 Q 14 7 30 8 Q 39 9 35 18 L -15 18 Z','#342b22');line(c,[[-12,14],[31,14]],'#be965b',2);c.restore();joint(c,leg[1]);
 }
 // Coat tails and a pierced, scalloped skirt.
 c.save();c.rotate(Math.sin(t*2)*.035);path(c,'M -14 -9 Q -49 34 -77 23 L -69 67 Q -32 60 -4 28 L 39 64 L 56 41 Q 26 24 16 -9 Z',tone);for(let i=0;i<4;i++)flower(c,-53+i*18,39-i*5,8);c.restore();
 path(c,'M -27 -98 Q 0 -108 31 -96 L 25 -29 L 46 16 Q 0 43 -44 16 L -25 -26 Z',tone);
 path(c,'M -17 -89 L 17 -89 L 15 -32 L -15 -32 Z','#6f452c','#be965b');
 for(let y=-75;y<-28;y+=18)ornament(c,0,y,8);
 for(let i=-2;i<=2;i++){line(c,[[i*7,-22],[i*15,14]],'#c7a264',1.4);flower(c,i*12,9,7);}
 line(c,[[-26,-30],[26,-30]],'#d0a55c',5);dot(c,0,-30,7,'#957844','#38281b');
 segment(c,p.right[0],p.right[1],25,tone);segment(c,p.right[1],p.right[2],18,tone);
 for(const arm of [p.left,p.right]){joint(c,arm[0],9);joint(c,arm[1],6);joint(c,arm[2],5);c.save();c.translate(arm[2].x,arm[2].y);path(c,'M -5 -4 L 6 -6 Q 19 -6 20 -1 L 9 2 L 14 6 L 3 9 L -6 5 Z','#a87b42');c.restore();}
 if(ping){const hand=p.right[2];line(c,[[hand.x+7,hand.y],[hand.x+24,hand.y-20]],'#47311f',5);dot(c,hand.x+31,hand.y-29,16,'#443323','#b58d4e');flower(c,hand.x+31,hand.y-29,10,'#a4773d');}
 // Profile head with a traditional headdress, cutout eye, and curved nose.
 path(c,'M -8 -97 L -8 -119 L 11 -121 L 13 -97 Z','#9c723f');
 c.save();c.translate(0,-139);c.rotate(Math.sin(t*1.3)*.035);
 path(c,'M -24 -25 Q -4 -39 20 -24 L 24 -8 L 37 -1 L 24 5 L 26 16 Q 13 30 -5 17 L -16 9 L -25 1 Z','#bd9455');
 path(c,'M 0 -17 Q 14 -28 21 -13 Q 12 -2 3 -9 Z','#f3d18a');path(c,'M 7 -12 Q 16 -19 20 -13 Q 15 -8 7 -12 Z','#312a22');
 line(c,[[3,-23],[21,-25]],'#3c2a20',2);path(c,'M 16 7 Q 29 6 24 10 L 15 11 Z','#4c2920');
 path(c,'M -25 -10 L -32 -43 Q -28 -61 -8 -70 Q 15 -65 24 -38 L 22 -27 Z',tone);
 for(let i=0;i<9;i++){const a=Math.PI+i*Math.PI/8;const x=-4+Math.cos(a)*35,y=-37+Math.sin(a)*34;ornament(c,x,y,8);}
 ornament(c,-5,-44,15);ornament(c,-22,-20,10);dot(c,-8,12,6,'#a17c43','#38291b');
 // Long pheasant plumes.
 for(let s=0;s<2;s++){
  const bend=Math.sin(t*1.9+s)*9;
  c.beginPath();c.moveTo(-10-s*13,-57);c.bezierCurveTo(-78-s*18,-162,103+bend+s*23,-167,72+bend+s*15,-70);c.strokeStyle='#54432c';c.lineWidth=2.5;c.stroke();
  for(let i=0;i<14;i++){const a=i/13;const x=-13+105*a,y=-63-Math.sin(a*Math.PI*.85)*83;line(c,[[x-4,y-7],[x+2,y+2],[x+8,y-4]],'#796242',.9);}
 }
 c.restore();
}
function background(){
 const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 const light=g.createRadialGradient(590,330,15,600,370,740);light.addColorStop(0,'#fff0ba');light.addColorStop(.35,'#efd39a');light.addColorStop(.75,'#c49658');light.addColorStop(1,'#754321');g.fillStyle=light;g.fillRect(0,0,W,H);
 let seed=37;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const noise=g.getImageData(0,0,W,H);for(let i=0;i<noise.data.length;i+=4){const n=(rnd()-.5)*11;noise.data[i]+=n;noise.data[i+1]+=n;noise.data[i+2]+=n;}g.putImageData(noise,0,0);
 g.strokeStyle='#613f1b0a';g.lineWidth=1;for(let x=0;x<W;x+=3){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}for(let y=0;y<H;y+=4){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
 // Theatre border with a delicate repeated cloud motif.
 g.strokeStyle='#6d442554';g.lineWidth=2;g.strokeRect(12,12,W-24,H-24);g.strokeStyle='#78502733';g.strokeRect(19,19,W-38,H-38);
 for(let x=35;x<W-35;x+=30){line(g,[[x,27],[x+8,33],[x+16,27]],'#6b48262b');line(g,[[x,H-27],[x+8,H-33],[x+16,H-27]],'#6b48262b');}
 return c;
}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.bg=background();this.art=new TraditionalArtwork();this.actor=document.createElement('canvas');this.actor.width=W;this.actor.height=H;this.a=this.actor.getContext('2d');}
 drawActor(x,y,scale,flip,p,t,ping,rods,tone='#54402a',silk=38,joints=false,dress={}){
  x+=p.rootX||0;y+=p.rootY||0;const rootAngle=p.rootAngle||0;
  const visualTime=ping?0:t;
  const a=this.a;a.clearRect(0,0,W,H);a.save();a.translate(x,y-p.jump);a.scale(scale*flip,scale);a.rotate(rootAngle+p.sway*.004);if(this.art.ready)this.art.puppet(a,p,visualTime,ping,dress);else puppet(a,p,visualTime,ping,tone);a.restore();
  if(silk>0){a.save();a.globalCompositeOperation='source-atop';a.lineWidth=.6;a.strokeStyle=`rgba(255,242,206,${silk/700})`;a.beginPath();for(let yy=0;yy<H;yy+=3){a.moveTo(0,yy);a.lineTo(W,yy+14);}a.stroke();const shine=a.createLinearGradient(x-100,0,x+100,0);shine.addColorStop(0,'#fff3cd00');shine.addColorStop(.5,'#fff3cd24');shine.addColorStop(1,'#fff3cd00');a.fillStyle=shine;a.fillRect(0,0,W,H);a.restore();}
  const c=this.c;if(rods){c.save();c.globalAlpha=.22;c.filter='blur(7px)';c.drawImage(this.actor,20,-18,W*1.025,H*1.025);c.restore();
   for(const hand of [p.left[2],p.legL[2],p.neckPoint,p.legR[2],p.right[2]]){const rx=hand.x*Math.cos(rootAngle)-hand.y*Math.sin(rootAngle),ry=hand.x*Math.sin(rootAngle)+hand.y*Math.cos(rootAngle),hx=x+rx*scale*flip,hy=y-p.jump+ry*scale;line(c,[[hx+42+Math.sin(visualTime)*5,80],[hx,hy]],'#4a3a2577',1.5);dot(c,hx,hy,2,'#392e20');}}
  c.save();c.globalAlpha=1-silk*.0045;c.drawImage(this.actor,0,0);c.restore();
  if(joints){c.save();c.translate(x,y-p.jump);c.scale(scale*flip,scale);c.rotate(rootAngle);for(const points of [p.left,p.right,p.legL,p.legR]){line(c,points.map(v=>[v.x,v.y]),'#54baa2',1);for(const point of points)dot(c,point.x,point.y,3,'#d2f3b7','#35604c');}dot(c,0,0,4,'#f4c061','#764924');dot(c,p.neckPoint.x,p.neckPoint.y,4,'#f4c061','#764924');c.restore();}
 }
 drawHandShadow(points,pose,x,y,scale,flip,ping=false){
  const c=this.c,h=projectHand(points,x+85*flip);c.save();c.fillStyle='#302416';c.strokeStyle='#302416';c.lineJoin='round';c.lineCap='round';c.globalAlpha=.22;c.filter='blur(2px)';
  c.beginPath();[0,1,5,9,13,17].forEach((n,i)=>i?c.lineTo(h[n].x,h[n].y):c.moveTo(h[n].x,h[n].y));c.closePath();c.fill();
  for(const {chain} of FINGER_LINKS){const ids=[0,...chain];for(let i=1;i<ids.length;i++){c.lineWidth=i===1?27:22-i*3;c.beginPath();c.moveTo(h[ids[i-1]].x,h[ids[i-1]].y);c.lineTo(h[ids[i]].x,h[ids[i]].y);c.stroke();}}
  c.restore();c.save();c.lineWidth=1.2;c.strokeStyle='#49342277';
  const anchors=ping?[pose.paddle,pose.right[2],pose.left[2],pose.legL[2],pose.legR[2]]:[pose.left[2],pose.legL[2],pose.neckPoint,pose.legR[2],pose.right[2]];
  FINGER_LINKS.forEach(({tip},i)=>{const a=anchors[i],px=x+a.x*scale*flip,py=y-pose.jump+a.y*scale;c.beginPath();c.moveTo(h[tip].x,h[tip].y);c.lineTo(px,py);c.stroke();c.beginPath();c.arc(h[tip].x,h[tip].y,4,0,Math.PI*2);c.stroke();});c.restore();
 }
 render(state){
  const c=this.c,{t,scene,control,action,settings,rally}=state;c.clearRect(0,0,W,H);const paper=this.art.ready?this.art.paper:this.bg;if(this.paperSource!==paper){this.paperSource=paper;this.paperCache=document.createElement('canvas');this.paperCache.width=W;this.paperCache.height=H;const pc=this.paperCache.getContext('2d');pc.filter='saturate(0.48) brightness(0.87)';pc.drawImage(paper,0,0,W,H);}c.drawImage(this.paperCache,0,0);
  c.fillStyle=`rgba(74,38,12,${(100-settings.light)/500})`;c.fillRect(0,0,W,H);
  // Moon and haze sit behind the actors.
  const glow=c.createRadialGradient(600,320,20,600,320,500);glow.addColorStop(0,'#fff2c520');glow.addColorStop(1,'#fff0ba00');c.fillStyle=glow;c.fillRect(0,0,W,H);
  const p=state.poses?.[0]||poseFor(control,t,action,scene);
  if(scene==='solo'){
   const index=settings.previewPlayer||0,cp=index?state.control2||control:control,pose=state.poses?.[index]||p;
   const px=600+(cp.x-.5)*260,py=427+(cp.gesture?(cp.y-.5)*150:0);
   if(state.handShadows?.[index])this.drawHandShadow(state.handShadows[index],pose,px,py,1.25,1,true);
   this.drawActor(px,py,1.25,1,pose,t,!!cp.gesture,settings.rods&&!state.handShadows?.[index],'#654632',settings.silk,settings.joints,index?settings.dress2:settings.dress);
   c.save();c.fillStyle='#79572c60';c.font='24px Pixel';c.textAlign='center';c.restore();
  }else{
   const [a,other]=state.placements||[{x:310,y:445},{x:925,y:445}];const by=rally.ball.y;const op=state.poses?.[1]||poseFor(null,t+.4,{jump:0,kick:0,wave:0,dance:0},scene,true,by);
   if(state.handShadows?.[0])this.drawHandShadow(state.handShadows[0],p,a.x,a.y,1.05,1,true);if(state.handShadows?.[1])this.drawHandShadow(state.handShadows[1],op,other.x,other.y,1.05,-1,true);
   this.drawActor(a.x,a.y,1.05,1,p,t,true,settings.rods&&!state.handShadows?.[0],'#63402a',settings.silk,settings.joints,settings.dress);this.drawActor(other.x,other.y,1.05,-1,op,t+.6,true,settings.rods&&!state.handShadows?.[1],'#494334',settings.silk,settings.joints,settings.dress2||{color:'jade',headdress:'crown',robe:'light'});
   // Low Chinese table and fine net.
   path(c,'M 420 540 L 780 540 L 774 554 L 426 554 Z','#745231','#49331f');
   for(const x of [438,755]){path(c,`M ${x} 552 L ${x+12} 552 L ${x+10} 643 L ${x+3} 643 Z`,'#68482b');}
   line(c,[[445,612],[762,612]],'#765330',5);line(c,[[600,540],[600,500]],'#765330',2);for(let y=503;y<539;y+=5)line(c,[[595,y],[606,y]],'#8e6940',1);
   // The displayed 22px halo is also the physical paddle radius.
   for(const [pose,x,y,flip] of [[p,a.x,a.y,1],[op,other.x,other.y,-1]]){c.save();c.setLineDash([3,4]);c.strokeStyle='#73573e65';c.lineWidth=1;c.beginPath();c.arc(x+pose.paddle.x*1.05,y-pose.jump+pose.paddle.y*1.05,22,0,Math.PI*2);c.stroke();c.restore();}
   const b=rally.ball;dot(c,b.x+5,b.y+9,10,'#59442b20');c.save();c.translate(b.x,b.y);c.rotate(b.angle||0);
   const sheen=c.createRadialGradient(-4,-5,1,0,0,12);sheen.addColorStop(0,'#f8ecd97a');sheen.addColorStop(1,'#94704b48');dot(c,0,0,11,sheen,'#735337aa');
   c.beginPath();c.arc(0,0,10.7,0,Math.PI*2);c.clip();
   for(const angle of [0,Math.PI/3,-Math.PI/3]){c.save();c.rotate(angle);for(const xx of [-6,0,6]){c.beginPath();c.ellipse(xx,0,3.1,12,0,0,Math.PI*2);c.strokeStyle='#997647bf';c.lineWidth=1.5;c.stroke();c.strokeStyle='#f1dfb57d';c.lineWidth=.45;c.stroke();}c.restore();}
   c.strokeStyle='#fff1d84a';c.lineWidth=.35;for(let y=-10;y<11;y+=2){c.beginPath();c.moveTo(-11,y);c.lineTo(11,y+2);c.stroke();}c.restore();
  }
  // Translucent warm light unifies the cutout layers.
  c.fillStyle='#b9a58308';c.fillRect(0,0,W,H);
 }
}