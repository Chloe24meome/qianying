// Atlas coordinates and pivot points were calibrated against warrior-atlas.png.
// Each leather piece retains its original alpha and rotates around its own rivets.
const parts={
 head:[0,0,478,448],torso:[478,0,400,448],upper:[887,0,443,448],fore:[1330,0,444,368],hand:[1550,365,224,83],
 thigh:[0,448,443,439],shin:[443,448,444,439],boot:[887,448,443,439],skirt:[1330,448,444,439]
};
export class TraditionalArtwork {
 constructor(){
  this.variants={};this.paper=new Image();this.atlas=new Image();this.atlasMask=new Image();this.ready=false;this.error=null;
  this.loading=Promise.all([this.load(this.paper,'./assets/ascii-xuan-paper.png'),this.load(this.atlas,'./assets/ascii-warrior-export.png'),this.load(this.atlasMask,'./assets/warrior-atlas.png')]).then(()=>{
   // Keep the exported ASCII colors, but restore the calibrated original alpha silhouette.
   // Normalize 3548x1774 export to the original atlas coordinates without moving pivots.
   const atlas=document.createElement('canvas');atlas.width=this.atlasMask.naturalWidth;atlas.height=this.atlasMask.naturalHeight;
   const ctx=atlas.getContext('2d');ctx.drawImage(this.atlas,0,0,atlas.width,atlas.height);
   ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.atlasMask,0,0,atlas.width,atlas.height);
   this.atlas=atlas;this.variants.cinnabar=atlas;this.updatePortrait('cinnabar',atlas);this.ready=true;
   return Promise.all(Object.entries({jade:'new_jade-phoenix-v2.png',indigo:'new_indigo-crane-v2.png',amber:'new_amber-lion-v2.png'}).map(async([key,file])=>{
    const img=new Image();await this.load(img,'./assets/'+file);
    const sprite=document.createElement('canvas');sprite.width=1774;sprite.height=887;const g=sprite.getContext('2d');g.drawImage(img,0,0,1774,887);
    const mask=new Image();await this.load(mask,'./assets/'+file.replace('new_',''));
    g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0,1774,887);g.globalCompositeOperation='source-over';
    this.variants[key]=sprite;
    this.updatePortrait(key,sprite);
   }));
  }).catch(e=>{this.error=e;console.error(e);});
 }
 updatePortrait(key,atlas){const portrait=document.createElement('canvas');portrait.width=478;portrait.height=448;portrait.getContext('2d').drawImage(atlas,0,0,478,448,0,0,478,448);document.querySelectorAll('.portrait.'+key).forEach(el=>{el.style.backgroundImage=`url(${portrait.toDataURL()})`;el.style.backgroundSize='contain';el.style.backgroundPosition='center';});}
 load(img,url){return new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('美术素材加载失败：'+url));img.src=url;});}
 piece(c,name,x,y,w,h){const r=parts[name];c.drawImage(this.atlas,...r,x,y,w,h);}
 bone(c,name,a,b,pivot,tip){
  const r=parts[name],dx=tip[0]-pivot[0],dy=tip[1]-pivot[1],scale=Math.hypot(b.x-a.x,b.y-a.y)/Math.hypot(dx,dy);
  c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x)-Math.atan2(dy,dx));c.scale(scale,scale);
  c.drawImage(this.atlas,...r,r[0]-pivot[0],r[1]-pivot[1],r[2],r[3]);c.restore();
 }
 leg(c,points,ankle=0){this.bone(c,'thigh',points[0],points[1],[225,493],[243,830]);this.bone(c,'shin',points[1],points[2],[662,495],[690,836]);
  c.save();c.translate(points[2].x,points[2].y);c.rotate(ankle);c.scale(.16,.16);const r=parts.boot;c.drawImage(this.atlas,...r,r[0]-1025,r[1]-610,r[2],r[3]);c.restore();
 }
 arm(c,points,wrist=0){this.bone(c,'upper',points[0],points[1],[1096,64],[1120,389]);this.bone(c,'fore',points[1],points[2],[1527,62],[1627,367]);
  const angle=Math.atan2(points[2].y-points[1].y,points[2].x-points[1].x)-Math.atan2(305,100),scale=Math.hypot(points[2].x-points[1].x,points[2].y-points[1].y)/Math.hypot(100,305);
  c.save();c.translate(points[2].x,points[2].y);c.rotate(angle+wrist);c.scale(scale,scale);const r=parts.hand;c.drawImage(this.atlas,...r,r[0]-1627,r[1]-367,r[2],r[3]);c.restore();
 }
 puppet(c,p,t,ping,dress={}){
  this.atlas=this.variants[dress.color]||this.variants.cinnabar;
  this.leg(c,p.legL,p.ankleL);
  c.save();c.translate(-5,6);c.rotate(Math.sin(t*1.7)*.045);this.piece(c,'skirt',-69,-11,136,114);c.restore();
  this.leg(c,p.legR,p.ankleR);
  c.drawImage(this.atlas,478,359,400,89,-46,0,94,28);
  c.save();c.rotate(p.waist);c.drawImage(this.atlas,478,0,400,359,-46,-113,94,113);c.restore();
  this.arm(c,p.left,p.wristL);this.arm(c,p.right,p.wristR);
  c.save();c.translate(p.neckPoint.x,p.neckPoint.y);c.rotate(p.waist+p.neck);c.scale(.42,.42);
  const r=parts.head,feather=new Path2D('M -360 -416 L 5 -416 L 5 -331 L -45 -279 L -110 -216 L -155 -116 L -220 -11 L -360 -11 Z');
  const bodyMask=new Path2D();bodyMask.rect(-360,-416,478,448);bodyMask.addPath(feather);
  if(dress.headdress==='crown'){
   c.save();const crown=new Path2D('M -155 -235 Q -150 -280 -115 -290 Q -110 -330 -85 -342 Q -57 -317 -45 -295 Q -15 -308 5 -280 L 50 -210 L 118 -150 L 118 32 L -230 32 L -195 -140 Z');c.clip(crown);c.drawImage(this.atlas,...r,-360,-416,r[2],r[3]);c.restore();
   c.save();c.strokeStyle='#c9ad72';c.lineWidth=3;c.beginPath();c.moveTo(-150,-238);c.quadraticCurveTo(-135,-281,-113,-287);c.quadraticCurveTo(-107,-322,-85,-338);c.quadraticCurveTo(-58,-313,-45,-290);c.stroke();for(let k=0;k<7;k++){c.beginPath();c.arc(-131+k*12,-264-Math.sin(k/6*Math.PI)*42,3,0,Math.PI*2);c.stroke();}c.restore();
  }else if(ping){c.drawImage(this.atlas,...r,-360,-416,r[2],r[3]);}else{
  c.save();c.clip(bodyMask,'evenodd');c.drawImage(this.atlas,...r,-360,-416,r[2],r[3]);c.restore();
  c.save();c.translate(-60,-281);c.rotate(p.plume||0);c.translate(60,281);c.clip(feather);c.drawImage(this.atlas,...r,-360,-416,r[2],r[3]);c.restore();
  }
  c.restore();
  if(ping){const hand=p.right[2];c.save();c.translate(hand.x,hand.y);c.rotate(p.paddleAngle);c.strokeStyle='#50351e';c.lineWidth=4;c.beginPath();c.moveTo(8,5);c.lineTo(30,-23);c.stroke();c.beginPath();c.ellipse(35,-30,15,18,.2,0,Math.PI*2);c.fillStyle='#58311f';c.fill();c.strokeStyle='#be9251';c.lineWidth=1.5;c.stroke();c.beginPath();c.ellipse(35,-30,10,13,.2,0,Math.PI*2);c.stroke();c.restore();}
 }
}