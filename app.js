import {installGameUI} from './game-ui.js';
import {HandTracks,TRACK_HOLD_MS} from './hand-tracks.js';
import {resultPresentation} from './match-result.js';
import {GestureController,FINGER_LINKS} from './gesture-control.js';
import {MatchAI,LEVELS,SHOTS} from './match-ai.js';
import {createTrackingClient} from './tracking-client.js';
import {manualControl,movePoint,responsiveValue,filterValue,cameraFailure,POINT_NAMES} from './manual.js';
import {Renderer} from './renderer.js';
import {actorPlacement,worldPaddle,poseFor,PlumeSpring,assignHands,aimPaddle,smoothOpponent,smoothControlNodes} from './rig.js';
import {clamp,mix,handControls,Rally} from './engine.js';
const $=id=>document.getElementById(id);let gameUI=null;
const stage=$('stage'),renderer=new Renderer(stage),video=$('camera'),overlay=$('tracking'),oc=overlay.getContext('2d');
const rally=new Rally({assist:true}),ai=new MatchAI(),demoAI=new MatchAI();
const handTracks=new HandTracks();let assignedHands=[null,null];
let difficulty=3;const gestureControllers=[new GestureController(),new GestureController()];
const outfits={cinnabar:'朱砂武生',jade:'青玉凤凰',indigo:'靛蓝云鹤',amber:'琥珀狮卫'};
let wardrobePlayer=0;let dress={color:'cinnabar',headdress:'plume',robe:'ceremonial'},dress2={color:'jade',headdress:'plume',robe:'ceremonial'};
try{const saved=JSON.parse(localStorage.getItem('shadow-dress')||'null');if(saved&&outfits[saved.color])dress={...dress,...saved};}catch{}
try{const saved=JSON.parse(localStorage.getItem('shadow-dress-p2')||'null');if(saved&&outfits[saved.color])dress2={...dress2,...saved};}catch{}
function syncDress(){const active=wardrobePlayer===1?dress2:dress;settings.dress={...dress};settings.dress2={...dress2};settings.previewPlayer=wardrobePlayer;document.querySelectorAll('[data-outfit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.outfit===active.color)));$('outfit-name').textContent='角色'+(wardrobePlayer+1)+' · '+outfits[active.color];$('headdress').value=active.headdress;try{localStorage.setItem('shadow-dress',JSON.stringify(dress));localStorage.setItem('shadow-dress-p2',JSON.stringify(dress2));}catch{}}

let previewMotion='stand',previewStarted=0;
let danceEnabled=false,duel=false,matchPaused=false,selectedPlayer=0,hands=[];const keys=new Set(),springs=[new PlumeSpring(),new PlumeSpring()],seen=[0,0],stable=[0,0],pinches=[false,false],fists=[-10,-10],gestures=[-10,-10];
const neutral=()=>manualControl();
const selectedPoints=[4,4];let dragging=false;let cameraStarting=false;
let opponentControl=neutral();
let target2=neutral(),control2=neutral(),action2={jump:0,kick:0,wave:0,dance:0};
const starts2={jump:-10,kick:-10,wave:-10,dance:-10};
let trackingMs=0,trackingFps=0,lastTrackingResult=0;
let manualUntil=0;
let scene='solo',mode='demo',stream=null,worker=null,workerBusy=false,session=0,lastFrame=-1,lastSend=0,lastSeen=0,hand=null;
let target=neutral(),control=structuredClone(target);
let settings={light:75,smoothing:35,rods:true,skeleton:true,silk:38,joints:false};
let action={jump:0,kick:0,wave:0,dance:0};
const starts={jump:-10,kick:-10,wave:-10,dance:-10},durations={jump:.85,kick:.8,wave:.55,dance:1.2};
let now=0,previous=performance.now(),lastPinch=false,fistTime=-10,lastGesture=-10,toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1900);}
function trigger(name,player=0){if(!$('result-panel').hidden)return;if(name==='dance'){if(scene!=='solo'){toast('请返回候场体验舞步');return;}previewMotion='stand';danceEnabled=!danceEnabled;toast(danceEnabled?'舞步已开启 · B 键停止':'舞步已停止');return;}const clock=player===1?starts2:starts;if(now-clock[name]<.25)return;clock[name]=now;}
function updateMode(next){danceEnabled=false;previewMotion='stand';mode=next;$('demo').setAttribute('aria-pressed',String(mode==='demo'));$('mouse').setAttribute('aria-pressed',String(mode==='mouse'));$('input-label').textContent={demo:'演示模式',mouse:duel?'双人键盘':'鼠标模式',camera:'手势模式'}[mode];if(next!=='camera'){hand=null;hands=[];}if(next==='mouse'){target=manualControl(control);target2=manualControl(control2);}syncManual();}
function stopCamera(message=''){
 cameraStarting=false;session++;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(worker)worker.terminate();worker=null;workerBusy=false;video.srcObject=null;hand=null;lastFrame=-1;lastSeen=0;lastPinch=false;fistTime=-10;
 handTracks.reset();assignedHands=[null,null];hands=[];gestureControllers.forEach(c=>c.reset());seen.fill(0);stable.fill(0);pinches.fill(false);fists.fill(-10);oc.clearRect(0,0,overlay.width,overlay.height);$('camera-empty').style.display='flex';$('camera-toggle').disabled=false;$('camera-toggle').textContent='◉ 开启摄像头';$('tracking-status').textContent='摄像头未开启';$('camera-message').textContent=message;
 manualUntil=0;updateMode('demo');
}
async function startCamera(){
 if(stream||worker||cameraStarting){cameraStarting=false;stopCamera();return;}
 cameraStarting=true;const token=++session;$('camera-toggle').disabled=false;$('camera-toggle').textContent='取消开启摄像头';$('camera-message').textContent='正在加载本地手势模型，请稍候。';
 try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('摄像头需要安全的本地地址。请用外部 Chrome / Edge 打开 http://127.0.0.1:4175，不能直接打开 HTML 文件。');
  // Load the local hand model before acquiring the camera.
  const prepared=await createTrackingClient(message=>{if(token===session)$('camera-message').textContent=message;},false,duel?2:1);
  if(token!==session){prepared.terminate();return;}worker=prepared;
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('请从 localhost 地址使用支持摄像头的 Chrome 或 Edge 浏览器打开。');
  $('camera-message').textContent='请在浏览器提示中允许访问摄像头。';
  $('camera-toggle').disabled=false;$('camera-toggle').textContent='取消开启摄像头';
  let media;try{media=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:duel?1280:640},height:{ideal:duel?720:480},frameRate:{ideal:30}}});}catch(error){if(error.name!=='OverconstrainedError')throw error;media=await navigator.mediaDevices.getUserMedia({audio:false,video:true});}
  if(token!==session){media.getTracks().forEach(t=>t.stop());return;}stream=media;video.srcObject=stream;await video.play();
  for(const track of stream.getVideoTracks())track.addEventListener('ended',()=>{if(token===session)stopCamera('摄像头连接已结束，请重新开启。');});
  overlay.width=video.videoWidth;overlay.height=video.videoHeight;
  worker.onerror=()=>stopCamera('识别线程运行失败，已释放摄像头。请重试。');
  worker.onmessage=({data})=>{
   if(token!==session)return;workerBusy=false;
   if(data.type==='error'){stopCamera('识别失败，已释放摄像头：'+data.message);return;}
   if(data.type==='result'){const received=performance.now();trackingMs=received-lastSend;trackingFps=lastTrackingResult?1000/(received-lastTrackingResult):0;lastTrackingResult=received;
    hands=data.hands||[];hand=hands[0]||null;
    const tracked=handTracks.update(hands,received,duel);const assigned=!duel&&scene==='solo'&&wardrobePlayer===1?[null,tracked[0]]:tracked;assignedHands=assigned;
    assigned.forEach((points,i)=>{
     const values=gestureControllers[i].update(points,scene);
     if(!values){stable[i]=0;pinches[i]=false;fists[i]=-10;return;}
     stable[i]++;
     seen[i]=performance.now();if(mode!=='camera')return;if(i===0){lastSeen=seen[0];target=values;}else target2=values;
     if($('gesture-shortcuts').checked&&values.pinch&&!pinches[i]&&now-gestures[i]>.4){trigger('wave',i);gestures[i]=now;}
     pinches[i]=values.pinch;if(values.open<.2)fists[i]=now;
     if($('gesture-shortcuts').checked&&values.open>.8&&now-fists[i]<.6&&now-gestures[i]>.5){trigger('jump',i);fists[i]=-10;gestures[i]=now;}
    });
    drawTracking();
    const active=selectedPlayer===1?target2:target;FINGER_LINKS.forEach((f,i)=>{$('finger-'+i).value=active.curl?.[i]||0;});
   }
  };
  if(video.requestVideoFrameCallback){const onVideoFrame=()=>{if(token!==session)return;captureFrame(performance.now());video.requestVideoFrameCallback(onVideoFrame);};video.requestVideoFrameCallback(onVideoFrame);}cameraStarting=false;updateMode('camera');$('camera-empty').style.display='none';$('camera-toggle').disabled=false;$('camera-toggle').textContent='◼ 关闭摄像头';$('camera-message').textContent=duel?'双方各举一只手，玩家一在左区，玩家二在右区。':(worker.backend==='main'?'兼容识别已启用。':'')+'手掌自然张开后点「校准」。弯指提线、伸指放线；五指分工见下方。视频仅在本机处理。';toast('镜头已就绪，举起手掌入戏');
 }catch(error){
  if(token!==session)return;
  const text=cameraFailure(error);
  stopCamera(text);toast('摄像头未开启，可继续鼠标演示');
 }
}
const chains=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
function drawTracking(){
 oc.clearRect(0,0,overlay.width,overlay.height);const w=overlay.width,h=overlay.height;
 if(!settings.skeleton)return;
 for(const [player,points] of handTracks.held(performance.now()).entries()){if(!points)continue;oc.strokeStyle=player===0?'#8cebc9':'#ffc57b';oc.lineWidth=2;oc.fillStyle=oc.strokeStyle;oc.font='24px Pixel';oc.fillText('P'+(player+1),(1-points[9].x)*w+12,points[9].y*h-12);
  for(const chain of chains){oc.beginPath();chain.forEach((index,i)=>{const p=points[index];i?oc.lineTo((1-p.x)*w,p.y*h):oc.moveTo((1-p.x)*w,p.y*h);});oc.stroke();}
  for(const p of points){oc.beginPath();oc.arc((1-p.x)*w,p.y*h,3,0,Math.PI*2);oc.fillStyle=oc.strokeStyle;oc.fill();}
 }
}
function reset(){$('result-panel').hidden=true;ai.reset();demoAI.reset();opponentControl={x:.5,y:.65,wrist:0,fingers:[.65,.95,.95,.65]};danceEnabled=false;previewMotion='stand';$('preview-action').value=danceEnabled?'dance':'stand';rally.reset();matchPaused=scene==='pingpong';$('match-toggle').textContent='开始对打';for(const k in starts){starts[k]=-10;starts2[k]=-10;}target2=neutral();control2=neutral();target=neutral();control=structuredClone(target);syncManual();$('score-left').textContent='0';$('score-right').textContent='0';toast('好戏重新开场');}
function selectScene(next){if(!$('play-dialog')?.open)gameUI?.setScreen(next==='solo'?'lobby':'match');const savedPose=[target,control,target2,control2];scene=next;selectedPlayer=scene==='solo'?wardrobePlayer:0;if(scene==='pingpong')selectedPoints[0]=4;$('action-player').value=String(selectedPlayer);$('action-player').disabled=!duel&&scene==='pingpong';syncActionKeys();const labels=['拇指 → 球拍转腕','食指 → 持拍手抬放 / 收伸','中指 → 左手抬放 / 伸展','无名指 → 左脚','小指 → 右脚'];labels.forEach((text,i)=>{$('finger-'+i).parentElement.firstChild.textContent=text+' ';});$('lobby').hidden=scene!=='solo';$('match-info').hidden=scene!=='pingpong';$('difficulty-label').hidden=duel;$('match-toggle').hidden=scene!=='pingpong';document.querySelector('[data-action="dance"]').hidden=scene!=='solo';document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.scene===scene)));$('scene-tag').textContent=scene==='solo'?'候场 · 角色试演':'第二幕 · 乒乓逗趣';$('caption').textContent=scene==='solo'?'选好行头，试演招式，再入球局。':'你来我往，台上见真章。';$('score').hidden=scene!=='pingpong';reset();[target,control,target2,control2]=savedPose;syncManual();}
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>selectScene(b.dataset.scene));
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>trigger(b.dataset.action,selectedPlayer));
$('camera-toggle').onclick=startCamera;
$('demo').onclick=()=>{if(duel)return;if(stream||worker||cameraStarting)stopCamera();updateMode('demo');};
$('mouse').onclick=()=>{if(stream||worker||cameraStarting)stopCamera();updateMode('mouse');toast(duel?'点击舞台后，两人分别使用键盘操作':'选择头、手或脚后拖动幕布；滚轮转腕，F 挥拍');};
$('reset').onclick=reset;
$('light').oninput=e=>{settings.light=Number(e.target.value);$('light-value').textContent=settings.light+'%';};
$('smoothing').oninput=e=>{settings.smoothing=Number(e.target.value);$('smooth-value').textContent=settings.smoothing+'%';};
$('rods').onchange=e=>settings.rods=e.target.checked;
$('skeleton').onchange=e=>{settings.skeleton=e.target.checked;drawTracking();};
$('settings-reset').onclick=()=>{settings={light:75,smoothing:35,rods:true,skeleton:true,silk:38,joints:false,dress:{...dress},dress2:{...dress2},previewPlayer:wardrobePlayer};$('silk').value=38;$('silk-value').textContent='38%';$('joints').checked=false;$('light').value=75;$('light-value').textContent='75%';$('smoothing').value=35;$('smooth-value').textContent='35%';$('rods').checked=true;$('skeleton').checked=true;drawTracking();};
$('help').onclick=()=>$('help-dialog').showModal();$('close-help').onclick=()=>$('help-dialog').close();
$('help-dialog').onclick=e=>{if(e.target===$('help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage-wrap').requestFullscreen();}catch{toast('当前浏览器不支持全屏，请在外部浏览器打开');}};
function manualStart(){manualUntil=performance.now()+2500;if(mode!=='mouse')updateMode('mouse');danceEnabled=false;previewMotion='stand';return selectedPlayer===1?target2:target;}
function syncManual(){if(!$('point-select'))return;const v=selectedPlayer===1?target2:target,n=v.nodes?.[selectedPoints[selectedPlayer]]||{x:0,y:0};$('point-select').value=String(selectedPoints[selectedPlayer]);$('point-x').value=n.x;$('point-y').value=n.y;$('wrist-angle').value=Math.round((v.wrist||0)*70);$('wrist-left').value=Math.round((v.wristLeft||0)*70);$('manual-status').textContent=`玩家${selectedPlayer+1} · ${POINT_NAMES[selectedPoints[selectedPlayer]]}`;}
$('point-select').onchange=e=>{selectedPoints[selectedPlayer]=Number(e.target.value);syncManual();};
for(const [id,axis] of [['point-x','x'],['point-y','y']])$(id).oninput=e=>{const value=Number(e.target.value),v=manualStart();v.nodes[selectedPoints[selectedPlayer]][axis]=value;};
$('wrist-angle').oninput=e=>{const value=Number(e.target.value),v=manualStart();v.wrist=value/70;};
$('wrist-left').oninput=e=>{const value=Number(e.target.value),v=manualStart();v.wristLeft=value/70;};
function pointer(e){if(!dragging&&!(scene==='pingpong'&&selectedPoints[selectedPlayer]===4))return;manualStart();const r=stage.getBoundingClientRect(),v=selectedPlayer===1?target2:target;const n=v.nodes[selectedPoints[selectedPlayer]];if(scene==='pingpong'&&selectedPoints[selectedPlayer]===4){const flip=selectedPlayer===1?-1:1,x=selectedPlayer===1?925:310;const wx=(e.clientX-r.left)/r.width*1200,wy=(e.clientY-r.top)/r.height*780;n.x=clamp(((wx-x)/1.05*flip-105)/24,-2,2);n.y=clamp((-20-(wy-445)/1.05)/66,-.2,2);syncManual();return;}n.x=clamp(((e.clientX-r.left)/r.width-.5)*4,-2,2);n.y=clamp((.5-(e.clientY-r.top)/r.height)*4,-2,2);syncManual();}
stage.addEventListener('pointerdown',e=>{stage.focus();manualStart();dragging=true;pointer(e);stage.setPointerCapture(e.pointerId);});
stage.addEventListener('pointermove',pointer);stage.addEventListener('pointerup',()=>dragging=false);stage.addEventListener('pointercancel',()=>dragging=false);
stage.addEventListener('wheel',e=>{e.preventDefault();const v=manualStart();v.wrist=clamp((v.wrist||0)-Math.sign(e.deltaY)*.08,-1,1);syncManual();},{passive:false});
window.addEventListener('keydown',e=>{
 if(gameUI?.blocked()||!$('result-panel').hidden||$('help-dialog').open||['INPUT','BUTTON','TEXTAREA','SELECT'].includes(e.target.tagName))return;
 const digits=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'];const digit=digits.indexOf(e.code);if(digit>=0&&(digit<5||duel)){e.preventDefault();manualStart();selectedPoints[digit<5?0:1]=digit%5;syncManual();return;}
 const movement=['KeyQ','KeyE','BracketLeft','BracketRight','KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
 if(movement.includes(e.code)){e.preventDefault();manualStart();keys.add(e.code);return;}if(e.repeat)return;
 const p2={Enter:'wave',ShiftRight:'jump',KeyL:'kick',KeyP:'dance'},p1={Space:'jump',KeyK:'kick',KeyF:'wave',KeyB:'dance'};
 const second=duel&&p2[e.code],name=second||p1[e.code];if(name){e.preventDefault();trigger(name,second?1:0);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});
$('opponent-mode').onchange=async e=>{const resumeCamera=!!stream;if(resumeCamera)stopCamera();handTracks.reset();gestureControllers.forEach(g=>g.reset());
 duel=e.target.value==='duel';$('wardrobe-player').disabled=false;syncDress();$('match-toggle').hidden=!duel;selectedPlayer=0;$('action-player').value='0';$('action-player').disabled=!duel&&scene==='pingpong';$('duel-guide').hidden=!duel;$('demo').disabled=duel;
 $('mouse').textContent=duel?'双人键盘':'鼠标操偶';syncActionKeys();$('player-left-name').textContent=duel?'玩家一':'你';$('player-right-name').textContent=duel?'玩家二':'对手';
 updateMode(mode);seen.fill(0);stable.fill(0);pinches.fill(false);fists.fill(-10);hands=[];
 selectScene(scene);drawTracking();$('camera-message').textContent=duel?'玩家一在左区，玩家二在右区，各举一只手。':'摄像头仅在本机处理；请将一只手放入画面。';if(resumeCamera)await startCamera();
};
function syncActionKeys(){const labels=selectedPlayer===1?{jump:'右Shift',kick:'L',wave:'Enter',dance:'P'}:{jump:'空格',kick:'K',wave:'F',dance:'B'};document.querySelectorAll('[data-action]').forEach(b=>b.querySelector('kbd').textContent=labels[b.dataset.action]);}
$('match-toggle').onclick=()=>{if(rally.gameWinner){showResult();return;}if(rally.winner){reset();matchPaused=false;}else matchPaused=!matchPaused;$('match-toggle').textContent=matchPaused?'继续对打':'暂停对打';stage.focus();};
$('action-player').onchange=e=>{selectedPlayer=Number(e.target.value);syncActionKeys();syncManual();};
$('silk').oninput=e=>{settings.silk=Number(e.target.value);$('silk-value').textContent=settings.silk+'%';};
$('joints').onchange=e=>settings.joints=e.target.checked;
window.addEventListener('pagehide',()=>stopCamera());
async function captureFrame(time){
 if(!worker||!stream||workerBusy||video.readyState<2||document.hidden||video.currentTime===lastFrame||time-lastSend<16)return;
 workerBusy=true;lastFrame=video.currentTime;lastSend=time;const current=worker,token=session;
 try{let frame;if(typeof createImageBitmap==='function')frame=await createImageBitmap(video,{resizeWidth:duel?640:480,resizeHeight:Math.max(1,Math.round(video.videoHeight/video.videoWidth*(duel?640:480))),resizeQuality:'low'});else{frame=document.createElement('canvas');frame.width=video.videoWidth;frame.height=video.videoHeight;frame.getContext('2d').drawImage(video,0,0);}if(token!==session){frame.close?.();return;}current.postMessage({type:'frame',frame,time},[frame]);}catch(error){workerBusy=false;stopCamera('视频帧无法送入识别：'+error.message);}
}
function animate(time){
 const dt=Math.min((time-previous)/1000,.04);previous=time;now=time/1000;
 if(mode==='mouse'&&manualUntil&&time> manualUntil&&!dragging&&!keys.size&&previewMotion==='stand'&&!danceEnabled){manualUntil=0;updateMode(stream?'camera':'demo');}
 if(mode==='demo'&&scene==='solo')target=neutral();
 if(mode==='demo'&&scene==='pingpong'&&!rally.winner&&rally.delay<=0&&!matchPaused)target=demoAI.update(target,rally.ball,dt,3,false);
 if(mode==='camera'){
  // Hold the last pose on missing observations; pause the ball after the grace interval.
 }else if(mode!=='demo'){
  for(const [i,v,up,down,left,right,ccw,cw] of [[0,target,'KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE'],[1,target2,'ArrowUp','ArrowDown','ArrowLeft','ArrowRight','BracketLeft','BracketRight']]){
   if(!v.nodes)continue;if(i===1&&!duel)continue;
   movePoint(v,selectedPoints[i],((keys.has(right)?1:0)-(keys.has(left)?1:0))*dt*2,((keys.has(up)?1:0)-(keys.has(down)?1:0))*dt*2);
   v.wrist=clamp((v.wrist||0)+((keys.has(cw)?1:0)-(keys.has(ccw)?1:0))*dt*2,-1,1);
  }
  if(keys.size)syncManual();
 }
 const blend=1-Math.exp(-dt*(38-settings.smoothing*.30));
 for(const [c,v] of [[control,target],[control2,target2]]){c.gesture=!!v.gesture;c.x=filterValue(c.x,v.x,dt,2.5,.004);c.y=filterValue(c.y,v.y,dt,2.5,.004);if(v.nodes)c.nodes=smoothControlNodes(c.nodes,v.nodes,dt);else delete c.nodes;c.wrist=mode==='camera'?responsiveValue(c.wrist||0,v.wrist||0,dt):filterValue(c.wrist||0,v.wrist||0,dt,5,.008);c.wristLeft=filterValue(c.wristLeft||0,v.wristLeft??-(v.wrist||0)*.7,dt,5,.008);c.fingers=c.fingers.map((f,i)=>mix(f,v.fingers[i],blend));}
 for(const [a,clock] of [[action,starts],[action2,starts2]])for(const key in a){const elapsed=(now-clock[key])/durations[key];a[key]=elapsed>=0&&elapsed<1?elapsed:0;}
 action.dance=scene==='solo'&&(danceEnabled||mode==='demo')&&wardrobePlayer===0;action2.dance=scene==='solo'&&(danceEnabled||mode==='demo')&&wardrobePlayer===1;
 if(scene==='pingpong'&&!duel&&!rally.winner&&rally.delay<=0&&!matchPaused)opponentControl=ai.update(opponentControl,rally.ball,dt,difficulty,true);
 action.preview=scene==='solo'&&wardrobePlayer===0?previewMotion:'stand';action2.preview=scene==='solo'&&wardrobePlayer===1?previewMotion:'stand';action.previewTime=action2.previewTime=now-previewStarted;
 const poses=[poseFor(control,now,action,scene),(duel||scene==='solo')?poseFor(control2,now,action2,scene):poseFor(opponentControl,now,{},scene)];
 poses.forEach((p,i)=>{if(scene==='pingpong'){p.plume=0;springs[i].angle=0;springs[i].velocity=0;springs[i].previous=0;}else p.plume=springs[i].update(p.waist+p.neck+p.jump*.002,dt);});
 const placements=[actorPlacement(control,false,mode==='camera'),actorPlacement(control2,true,duel&&mode==='camera')];
 const paddles=poses.map((p,i)=>worldPaddle(p,placements[i],i===1));
 const previewInput=!duel&&scene==='solo'?wardrobePlayer:0;const cameraReady=mode!=='camera'||(seen[previewInput]>0&&time-seen[previewInput]<TRACK_HOLD_MS&&(!duel||(seen[1]>0&&time-seen[1]<TRACK_HOLD_MS)));
 if(!gameUI?.blocked()&&scene==='pingpong'&&cameraReady&&!matchPaused&&!$('help-dialog').open&&!document.hidden){
  const event=rally.update(dt,{paddleX:paddles[0].x,paddleY:paddles[0].y,swing:now-starts.wave<.65,auto:mode==='demo',now,duel,rightPaddleX:paddles[1].x,rightPaddleY:paddles[1].y,rightSwing:duel&&now-starts2.wave<.65,rightShotSpeed:duel?255:SHOTS[ai.shot].speed,rightShotHeight:duel?390:SHOTS[ai.shot].height});
  if(event==='left'||event==='right'){ai.reset();demoAI.reset();}
  if(event==='left'||event==='right'){$('score-left').textContent=rally.left;$('score-right').textContent=rally.right;const who=event==='left'?(duel?'玩家一':'你'):(duel?'玩家二':'对手');if(rally.gameWinner)showResult();else toast(who+'得一分 · 本球回击 '+rally.lastRallyHits+' 次');}
 }
 $('match-progress').textContent='第 '+rally.gameNumber+' 局 · 局数 '+rally.games.left+' : '+rally.games.right;const serving=rally.server==='left'?(duel?'玩家一':'我方'):(duel?'玩家二':'对手');$('serve-status').textContent=rally.gameWinner?'本局结束':serving+'发球'+(rally.left>=10&&rally.right>=10?' · 需领先 2 分':'');
 if($('quick-pause'))$('quick-pause').textContent=matchPaused?'▷ 续演':'Ⅱ 歇场';
 $('rally-count').textContent='本球回击 '+rally.hits+' 次';$('ai-shot').textContent=duel?'双人切磋':LEVELS[difficulty-1].name+' · '+ai.shot;
 const handShadows=gestureControllers.map((g,i)=>mode==='camera'&&seen[i]>0&&time-seen[i]<TRACK_HOLD_MS&&$('hand-shadow').checked?g.shadow:null);
 if(!gameUI||['lobby','match'].includes(gameUI.screen))renderer.render({t:now,scene,control,action,settings,rally,poses,handShadows,placements,control2,duel});
 $('stage-state').textContent=scene==='pingpong'&&rally.gameWinner?'本局已结束 · 查看结算牌':scene==='pingpong'&&matchPaused?'○ 对局暂停 · 点击开始 / 继续对打':mode==='demo'?'● 自动演示中':mode==='mouse'?(duel?'● 双人键盘对打':scene==='pingpong'?'● 移动鼠标接球 · F 挥拍 · 1～5 选点':'● 鼠标 / 键盘操偶'):cameraReady?(duel?'● 双方手势已连接':'● 手势已连接'):'○ 等待手掌入区 · 对局暂停';
 if(stream)$('tracking-status').textContent=duel?`P1 ${time-seen[0]<TRACK_HOLD_MS?'已连接':'等待'} / P2 ${time-seen[1]<TRACK_HOLD_MS?'已连接':'等待'} · ${Math.round(trackingFps)} 帧/秒 · ${Math.round(trackingMs)} 毫秒`:time-seen[previewInput]<TRACK_HOLD_MS?'● 手势 '+Math.round(trackingFps)+' 帧/秒 · 处理 '+Math.round(trackingMs)+' 毫秒':'○ 请将手掌放入镜头';
 captureFrame(time);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

$('difficulty').onchange=e=>{difficulty=Number(e.target.value);ai.reset();toast('对手强度：'+LEVELS[difficulty-1].name);};
$('enter-match').onclick=()=>{selectScene('pingpong');matchPaused=false;$('match-toggle').textContent='暂停对打';stage.focus();};
$('back-lobby').onclick=()=>selectScene('solo');
document.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{(wardrobePlayer===1?dress2:dress).color=b.dataset.outfit;syncDress();});
for(const key of ['headdress'])$(key).onchange=e=>{(wardrobePlayer===1?dress2:dress)[key]=e.target.value;syncDress();};
$('wardrobe-player').onchange=e=>{wardrobePlayer=Number(e.target.value);if(scene==='solo'){selectedPlayer=wardrobePlayer;$('action-player').value=String(selectedPlayer);}syncDress();syncManual();syncActionKeys();};
$('preview-action').onchange=e=>{const choice=e.target.value;manualStart();if(wardrobePlayer===1){target2=neutral();control2=neutral();}else{target=neutral();control=neutral();}syncManual();previewMotion=choice;previewStarted=now;danceEnabled=choice==='dance';if(['wave','jump','kick'].includes(choice))trigger(choice,wardrobePlayer);};
syncDress();

$('calibrate-hand').onclick=()=>{const assigned=assignedHands;let count=0;assigned.forEach((h,i)=>{if(h&&gestureControllers[i].calibrate(h))count++;});toast(count?'已校准 '+count+' 只手 · 当前姿态作为放松姿态':'请先开启摄像头，把手完整放入画面');};
updateMode('demo');

function showResult(){
 matchPaused=true;keys.clear();dragging=false;const result=resultPresentation(rally,duel);
 $('result-kicker').textContent=result.kicker;$('result-title').textContent=result.title;$('result-detail').textContent=result.detail;$('result-history').textContent=result.history;$('result-next').textContent=result.next;
 $('result-panel').dataset.outcome=rally.gameWinner==='left'?'win':'loss';$('result-panel').hidden=false;$('result-next').focus();$('match-toggle').textContent='查看结算';
}
$('result-next').onclick=()=>{
 if(rally.winner)reset();else if(rally.nextGame()){ai.reset();demoAI.reset();$('result-panel').hidden=true;for(const k in starts){starts[k]=-10;starts2[k]=-10;}}
 matchPaused=false;$('match-toggle').textContent='暂停对打';$('score-left').textContent=rally.left;$('score-right').textContent=rally.right;stage.focus();
};
$('result-lobby').onclick=()=>selectScene('solo');

gameUI=installGameUI({scene:selectScene,play:()=>{selectScene('pingpong');matchPaused=false;$('match-toggle').textContent='暂停对打';stage.focus();},stop:()=>{if(stream||worker||cameraStarting)stopCamera();}});
