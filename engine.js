export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export function solveLimb(root,target,l1,l2,bend=1){
 const dx=target.x-root.x,dy=target.y-root.y,raw=Math.hypot(dx,dy),d=clamp(raw,Math.abs(l1-l2)+.001,l1+l2-.001);
 const angle=Math.atan2(dy,dx),offset=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
 const joint={x:root.x+Math.cos(angle+offset*bend)*l1,y:root.y+Math.sin(angle+offset*bend)*l1};
 const tip={x:root.x+Math.cos(angle)*d,y:root.y+Math.sin(angle)*d};
 return [root,joint,tip];
}
export function handControls(points){
 if(!points||points.length!==21||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
 const dist=(a,b)=>Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y);
 const palm=Math.max(.025,dist(0,9));
 const fingers=[[5,8],[9,12],[13,16],[17,20]].map(([base,tip])=>clamp((dist(0,tip)/Math.max(.01,dist(0,base))-.9)/1.15,0,1));
 // Express fingertip motion in palm coordinates: wrist rotation must not tug every limb.
 const length=dist(0,9),ux=length>.001?(points[9].x-points[0].x)/length:0,uy=length>.001?(points[9].y-points[0].y)/length:-1;
 const nodes=[4,8,12,16,20].map(i=>{const dx=points[i].x-points[9].x,dy=points[i].y-points[9].y;return {x:clamp((dx*uy-dy*ux)/palm,-2,2),y:clamp((dx*ux+dy*uy)/palm,-2,2)};});
 return {nodes,x:clamp(1-points[9].x,0,1),y:clamp(points[9].y,0,1),wrist:clamp(Math.atan2(points[0].x-points[9].x,points[0].y-points[9].y)/1.2,-1,1),fingers,pinch:dist(4,8)/palm<.35,open:fingers.reduce((a,b)=>a+b)/4};
}
export const BALL_RADIUS=11, PADDLE_RADIUS=22;
// Sweep the ball relative to the moving paddle, so a fast frame cannot skip contact.
export function sweepCircle(a,b,center,radius){
 const dx=b.x-a.x,dy=b.y-a.y,x=a.x-center.x,y=a.y-center.y;
 const c=x*x+y*y-radius*radius;if(c<=0)return 0;
 const q=dx*dx+dy*dy;if(q<1e-9)return null;
 const v=2*(x*dx+y*dy),disc=v*v-4*q*c;if(disc<0)return null;
 const t=(-v-Math.sqrt(disc))/(2*q);return t>=0&&t<=1?t:null;
}
export class Rally {
 constructor({assist=false,random=Math.random}={}){this.assist=assist;this.random=random;this.reset();}
 reset(){this.lastRallyHits=0;this.left=0;this.right=0;this.winner=null;this.gameWinner=null;this.games={left:0,right:0};this.history=[];this.firstServer=this.random()<.5?'left':'right';this.lastHit=-10;this.previousPaddles=null;this.serve();}
 get gameNumber(){return this.history.length+(this.gameWinner?0:1);}
 get server(){const total=this.left+this.right,turn=this.left>=10&&this.right>=10?total-20:Math.floor(total/2);return turn%2?(this.firstServer==='left'?'right':'left'):this.firstServer;}
 awardPoint(side){
  if(this.gameWinner||this.winner||!['left','right'].includes(side))return false;
  this[side]++;this.lastRallyHits=this.hits;
  if(this[side]>=11&&Math.abs(this.left-this.right)>=2){this.gameWinner=side;this.games[side]++;this.history.push({left:this.left,right:this.right,winner:side});if(this.games[side]===2)this.winner=side;this.previousPaddles=null;}
  else this.serve();return true;
 }
 nextGame(){
  if(!this.gameWinner||this.winner)return false;
  this.left=0;this.right=0;this.gameWinner=null;this.firstServer=this.firstServer==='left'?'right':'left';this.lastHit=-10;this.lastRallyHits=0;this.serve();return true;
 }
 serve(direction=this.server==='left'?1:-1){this.assistHits=2+Math.floor(this.random()*5);this.hits=0;this.ball={x:600,y:330+this.random()*35,vx:direction*(215+this.random()*30),vy:-55,spin:0,angle:0};this.delay=1;this.previousPaddles=null;}
 update(dt,{paddleY=440,paddleX=420,swing=false,now=0,rightPaddleY=440,rightPaddleX=815,rightSwing=false,shotSpeed=255,shotHeight=390,rightShotSpeed=255,rightShotHeight=390}={}){
  if(this.winner||this.gameWinner)return null;dt=clamp(dt,0,.05);
  const pads=[{x:paddleX,y:paddleY,active:swing},{x:rightPaddleX,y:rightPaddleY,active:rightSwing}];
  const old=this.previousPaddles||pads;this.previousPaddles=pads;
  if(this.delay>0){this.delay-=dt;return null;}
  const b=this.ball,start={x:b.x,y:b.y};b.vy+=245*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle=(b.angle||0)+(b.spin||b.vx/60)*dt;
  let contact=null;
  for(let i=0;i<2;i++){
   if(now-this.lastHit<.08)continue;
   const p=pads[i],o=old[i],a={x:start.x-o.x,y:start.y-o.y},z={x:b.x-p.x,y:b.y-p.y};
   const t=sweepCircle(a,z,{x:0,y:0},BALL_RADIUS+PADDLE_RADIUS);if(t===null)continue;
   if(contact===null||t<contact.t)contact={i,t,p,o,a,z};
  }
  if(contact){
   const {i,t,p,o,a,z}=contact;let nx=mix(a.x,z.x,t),ny=mix(a.y,z.y,t),len=Math.hypot(nx,ny);if(len<.001){nx=i===0?1:-1;ny=0;len=1;}nx/=len;ny/=len;
   const pvx=clamp((p.x-o.x)/Math.max(dt,.001),-450,450),pvy=clamp((p.y-o.y)/Math.max(dt,.001),-450,450);
   let vx=b.vx-pvx,vy=b.vy-pvy;const approach=vx*nx+vy*ny;
   if(approach<0){
    const restitution=p.active?1.06:.88;vx-=(1+restitution)*approach*nx;vy-=(1+restitution)*approach*ny;
    b.vx=vx+pvx;b.vy=vy+pvy;const speed=Math.hypot(b.vx,b.vy);if(speed>620){b.vx*=620/speed;b.vy*=620/speed;}
    if(this.assist){
     // A forgiving return arc is applied only after real contact. Impact position and
     // paddle motion still vary the shot; no score or future contact is fabricated.
     const dir=i===0?1:-1,base=i===0?shotSpeed:rightShotSpeed,pressure=Math.max(0,this.hits-this.assistHits+1);
     const speed=clamp(base+pressure*42+(p.active?25:0)+Math.abs(pvx)*.08,200,490);
     b.vx=dir*speed;
     const distance=Math.max(160,Math.abs((i===0?775:455)-p.x)),flight=distance/speed;
     const height=clamp((i===0?shotHeight:rightShotHeight)+ny*(24+pressure*9)+pvy*.035,300,430);
     b.vy=clamp((height-p.y)/flight-122.5*flight,-290,90);
    }
    b.x=p.x+nx*(BALL_RADIUS+PADDLE_RADIUS+.3);b.y=p.y+ny*(BALL_RADIUS+PADDLE_RADIUS+.3);
    b.spin=clamp((pvx*ny-pvy*nx)/22+(a.y/33)*5,-16,16);this.lastHit=now;this.hits++;return i===0?'hit':'opponent';
   }
  }
  const floor=540-BALL_RADIUS;
  if(start.y<=floor&&b.y>=floor&&b.vy>0&&b.x>420&&b.x<780){b.y=floor;b.vy=-Math.abs(b.vy)*.86;b.vx*=.98;}
  if(b.x<270||b.x>950||b.y>710){const side=b.x<270?'right':b.x>950?'left':b.x<600?'right':'left';this.awardPoint(side);return side;}
  return null;
 }
}
