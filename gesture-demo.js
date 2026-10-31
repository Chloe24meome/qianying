import {Renderer} from './renderer.js';
import {GestureController,FINGER_LINKS} from './gesture-control.js';
import {demoHand} from './demo-hand.js';
import {actorPlacement,poseFor,smoothControlNodes} from './rig.js';
import {Rally} from './engine.js';
const renderer=new Renderer(document.getElementById('demo-stage')),gestures=new GestureController();
gestures.calibrate(demoHand());let selected=4,nodes,automatic=false;document.getElementById('demo-auto').onclick=()=>{automatic=!automatic;document.getElementById('demo-auto').textContent=automatic?'暂停示范':'自动弯伸';};document.getElementById('demo-bend').oninput=()=>{automatic=false;document.getElementById('demo-auto').textContent='自动弯伸';};
document.querySelectorAll('[data-finger]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.finger);document.querySelectorAll('[data-finger]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
const settings={light:75,silk:38,rods:false,joints:false,dress:{color:'jade',headdress:'plume'}},rally=new Rally();
const pingLabels=['拇指 / 转腕','食指 / 抬拍与收伸','中指 / 左手','无名指 / 左脚','小指 / 右脚'];
document.getElementById('demo-scene').onchange=()=>{document.querySelectorAll('[data-finger]').forEach((b,i)=>b.textContent=pingLabels[i]);};
let shortcut='',started=0;document.getElementById('demo-pinch').onclick=()=>{shortcut='wave';started=performance.now();};document.getElementById('demo-jump').onclick=()=>{shortcut='jump';started=performance.now();};
function frame(ms){const scene=document.getElementById('demo-scene').value;const amount=automatic?(1-Math.cos(ms*.002))/2:Number(document.getElementById('demo-bend').value)/100,curls=[0,0,0,0,0];curls[selected]=amount;const raw=demoHand(curls),control=gestures.update(raw.map(p=>({...p,x:p.x+Number(document.getElementById("demo-palm").value)/100})),scene);nodes=smoothControlNodes(nodes,control.nodes,1/60);control.nodes=nodes;
 const elapsed=(ms-started)/1000,action=elapsed<1.2?{[shortcut]:Math.min(1,elapsed/1.2)}:{};const pose=poseFor(control,ms/1000,action,scene);renderer.render({t:ms/1000,scene,control,action:{},settings,rally,poses:[pose],handShadows:[gestures.shadow],placements:[actorPlacement(control,false,true),actorPlacement({},true,false)]});
 document.getElementById('demo-status').textContent='模拟手影 · '+FINGER_LINKS[selected].name+'弯曲 '+Math.round(amount*100)+'% → '+pingLabels[selected]+' · 手指弯伸控制';requestAnimationFrame(frame);}
document.getElementById('demo-scene').onchange();requestAnimationFrame(frame);
