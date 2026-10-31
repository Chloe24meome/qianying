import {installWheel} from './motion-wheel.js';
import {TraditionalArtwork} from './artwork.js';
import {poseFor} from './rig.js';
import {manualControl} from './manual.js';
const $=id=>document.getElementById(id);
export function installGameUI(api){
 document.body.classList.add('game-shell');document.body.dataset.screen='home';
 const main=document.querySelector('main');main.id='game-stage-page';
 const shell=document.createElement('div');shell.innerHTML=`
 <section id="opening" aria-label="牵影 · 启幕"><canvas id="opening-film" width="1440" height="900" aria-label="原创皮影亮相循环动画"></canvas><div class="film-shade"></div><div class="film-frame"></div>
 
 <div class="opening-title"><div class="opening-seal">皮影<br>新戏</div><p>一灯照古今 · 十指牵人间</p><h1>牵<span>影</span></h1><button id="raise-curtain" class="game-primary">▸ 好戏开场 </button></div>
 <nav id="theatre-menu" aria-label="戏台菜单"><p class="menu-kicker">幕已启 · 请入戏</p><h2>牵影<span>戏台</span></h2><button id="menu-dress"><i>01</i> 挑影 <small>挑选行头 · 候场试演</small><b>↗</b></button><button id="menu-play"><i>02</i> 开锣 <small>独斗机巧 · 双人对台</small><b>↗</b></button><button data-open="tuning-dialog"><i>03</i> 调弦 <small>光影 · 操偶 · 画面</small><b>↗</b></button><button data-open="help-dialog"><i>04</i> 戏谱 <small>五指口诀 · 对台规矩</small><b>↗</b></button><button id="menu-exit"><i>05</i> 落幕 <small>返回启幕画面</small><b>↙</b></button></nav>
 <div class="opening-foot"><button id="film-toggle">Ⅱ 暂停背景演出</button></div></section>
 <nav id="game-nav" aria-label="剧场导航"><button id="return-menu">← 戏台</button><span class="game-wordmark">牵影 <small id="page-name">候场</small></span><div><button data-open="camera-dialog">◎ 掌灯 / 摄像头</button><button data-open="tuning-dialog">☷ 调弦</button><button data-open="help-dialog"><svg class="book-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 3h6l2 2 2-2h6v13h-6l-2 2-2-2H2zM10 5v13M4 7h3M4 10h3M13 7h3M13 10h3"/></svg> 戏谱</button></div></nav>
 <dialog id="camera-dialog" class="game-dialog camera-dialog"><div class="dialog-heading"><div><h2>掌灯 · 五指操偶</h2></div><button data-close aria-label="关闭摄像头面板">×</button></div><p id="camera-guide">一只手完整入镜，张开手掌，再校准。食指操拍，中指操左手。</p><div id="camera-mount"></div><div class="camera-tools"><button id="camera-calibrate" class="game-primary">校准手位</button><button id="camera-pin" class="game-secondary">悬浮监看</button><button id="camera-ready" class="game-secondary">收起面板 · 继续试演</button></div></dialog>
 <dialog id="tuning-dialog" class="game-dialog"><div class="dialog-heading"><div><h2>幕后调弦</h2></div><button data-close aria-label="关闭调校">×</button></div><div class="tuning-tabs" role="tablist"><button role="tab" aria-selected="true" data-tune="gesture">五指口诀</button><button role="tab" aria-selected="false" data-tune="look">灯影</button><button role="tab" aria-selected="false" data-tune="manual">戏杆 / 键鼠</button></div><div id="tuning-mount"></div></dialog>
 <dialog id="play-dialog" class="game-dialog play-dialog"><div class="dialog-heading"><div><h2>择戏 · 开锣</h2></div><button data-close aria-label="关闭对台选择">×</button></div><p>选一出好戏，再请对手登台。</p><div id="match-options"></div><div class="play-rule">三局两胜 / 每局 11 分<br><small>十平后须领先两分，漏接才计分。</small></div><button id="play-confirm" class="game-primary">▸ 开锣对台</button><button id="play-dress" class="game-secondary">先去挑影 / 更换行头</button></dialog>
 <section id="camera-monitor" hidden aria-label="悬浮摄像头监看"><div class="monitor-toolbar"><span>掌灯 / 实时监看</span><button id="monitor-expand">放大</button><button id="monitor-close" aria-label="收起悬浮监看">×</button></div><div id="monitor-mount"></div></section><div id="game-quickbar"><div><button id="quick-camera">◎ 掌灯</button><button id="quick-dress">行头匣</button><button id="quick-pause">Ⅱ 歇场</button><button id="quick-fullscreen">⛶ 满幕</button></div></div>`;
 document.body.append(shell);document.body.insertBefore($('game-nav'),main);
 const wardrobe=$('lobby');document.querySelector('.workspace').append(wardrobe);
 const cameraCard=document.querySelector('aside .control-card');$('camera-mount').append(cameraCard);
 const tuning=$('tuning-mount');for(const [selector,group] of [['.gesture-card','gesture'],['.settings-card','look'],['.manual-card','manual'],['.actions-card','manual']]){const el=document.querySelector(selector);el.dataset.tunePanel=group;el.hidden=group!=='gesture';tuning.append(el);}
 const options=document.querySelector('.match-settings');$('match-options').append(options);document.querySelector('.theatre-panel').append($('match-toggle'));
 for(const el of [document.querySelector('.match-rules'),$('duel-guide')])$('match-options').append(el);
 const ui={screen:'home',setScreen(screen){this.screen=screen;document.body.dataset.screen=screen;$('page-name').textContent=screen==='match'?'对台':'候场';$('quick-pause').hidden=screen!=='match';$('opening').inert=!['home','menu'].includes(screen);main.inert=['home','menu'].includes(screen);window.scrollTo(0,0);},blocked(){return ['home','menu'].includes(this.screen)||!!document.querySelector('dialog[open]');}};
 function open(id){if(id==='camera-dialog'){const preview=document.querySelector('.camera-preview');cameraCard.insertBefore(preview,$('camera-toggle'));$('camera-monitor').hidden=true;}const d=$(id);if(!d.open)d.showModal();if(id==='camera-dialog'){$('camera-guide').textContent=$('opponent-mode').value==='duel'?'每人举一只手，玩家一留在左半区，玩家二留在右半区。中线附近请保持距离。':'一只手完整入镜，张开手掌，再校准。食指操拍，中指操左手。';d.dataset.duel=String($('opponent-mode').value==='duel');}}
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>open(b.dataset.open));
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 for(const d of document.querySelectorAll('.game-dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
 $('raise-curtain').onclick=()=>{ui.setScreen('menu');$('menu-dress').focus();};
 $('menu-exit').onclick=()=>{api.stop();$('monitor-close').click();ui.setScreen('home');$('raise-curtain').focus();};
 $('return-menu').onclick=()=>{ui.setScreen('menu');$('menu-dress').focus();};
 const dress=()=>{api.scene('solo');ui.setScreen('lobby');};
 $('menu-dress').onclick=dress;$('quick-dress').onclick=dress;$('menu-play').onclick=()=>open('play-dialog');
 $('enter-match').onclick=()=>open('play-dialog');$('play-dress').onclick=()=>{$('play-dialog').close();dress();};
 $('play-confirm').onclick=()=>{$('play-dialog').close();api.play();ui.setScreen('match');};
 $('quick-camera').onclick=()=>open('camera-dialog');$('quick-fullscreen').onclick=()=>$('fullscreen').click();$('quick-pause').onclick=()=>$('match-toggle').click();
 $('camera-pin').onclick=()=>{$('monitor-mount').append(document.querySelector('.camera-preview'));$('camera-monitor').hidden=false;$('camera-monitor').dataset.duel=String($('opponent-mode').value==='duel');$('camera-dialog').close();};$('monitor-expand').onclick=()=>open('camera-dialog');$('monitor-close').onclick=()=>{$('camera-monitor').hidden=true;cameraCard.insertBefore(document.querySelector('.camera-preview'),$('camera-toggle'));};
 $('camera-calibrate').onclick=()=>$('calibrate-hand').click();$('camera-ready').onclick=()=>$('camera-dialog').close();
 document.querySelectorAll('[data-tune]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tune]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));document.querySelectorAll('[data-tune-panel]').forEach(x=>x.hidden=x.dataset.tunePanel!==b.dataset.tune);});
 $('help').textContent='戏谱';$('enter-match').textContent='▸ 行头已备 / 开锣';$('preview-action').options[0].textContent='亮相';installWheel();
 $('outfit-name').closest('.section-heading').querySelector('h2').textContent='行头匣';
 const monitor=$('camera-monitor'),handle=monitor.querySelector('.monitor-toolbar');handle.title='拖动移动监看窗口';let drag=null;
 handle.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=monitor.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(!drag)return;monitor.style.right='auto';monitor.style.left=Math.max(0,Math.min(innerWidth-monitor.offsetWidth,e.clientX-drag.x))+'px';monitor.style.top=Math.max(0,Math.min(innerHeight-monitor.offsetHeight,e.clientY-drag.y))+'px';});
 handle.addEventListener('pointerup',()=>drag=null);handle.addEventListener('pointercancel',()=>drag=null);
 const grip=document.createElement('button');grip.className='monitor-resize';grip.textContent='◢';grip.title='拖动调整大小 · 方向键微调';grip.setAttribute('aria-label','调整监看窗口大小');monitor.append(grip);
 let sizing=null;
 function sizeMonitor(w,h){const r=monitor.getBoundingClientRect();monitor.style.width=Math.max(Math.min(260,innerWidth-16),Math.min(w,innerWidth-r.left-8))+'px';monitor.style.height=Math.max(Math.min(190,innerHeight-16),Math.min(h,innerHeight-r.top-8))+'px';}
 grip.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const r=monitor.getBoundingClientRect();monitor.style.left=r.left+'px';monitor.style.top=r.top+'px';monitor.style.right='auto';sizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height};grip.setPointerCapture(e.pointerId);});
 grip.addEventListener('pointermove',e=>{if(sizing)sizeMonitor(sizing.w+e.clientX-sizing.x,sizing.h+e.clientY-sizing.y);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(type,()=>sizing=null);
 grip.addEventListener('keydown',e=>{const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!delta)return;e.preventDefault();const r=monitor.getBoundingClientRect();monitor.style.left=r.left+'px';monitor.style.right='auto';sizeMonitor(r.width+delta[0],r.height+delta[1]);});
 window.addEventListener('resize',()=>{if(monitor.hidden)return;const r=monitor.getBoundingClientRect();monitor.style.left=Math.max(8,Math.min(r.left,innerWidth-r.width-8))+'px';monitor.style.top=Math.max(8,Math.min(r.top,innerHeight-r.height-8))+'px';monitor.style.right='auto';sizeMonitor(r.width,r.height);});
 const camPreview=document.querySelector('.camera-preview');const zones=document.createElement('div');zones.className='camera-zones';zones.innerHTML='<span>玩家一 · 左区</span><span>玩家二 · 右区</span>';camPreview.append(zones);
 startOpening($('opening-film'),$('film-toggle'),()=>ui.screen);
 ui.setScreen('home');return ui;
}
// Original articulated shadow performance, using the game's translucent engraved parts.
function startOpening(canvas,toggle,screen){
 const art=new TraditionalArtwork(),c=canvas.getContext('2d'),paper=document.createElement('canvas');paper.width=1440;paper.height=900;let ready=false,last=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,clock=0;
 const updateLabel=()=>toggle.textContent=paused?'▷ 播放背景演出':'Ⅱ 暂停背景演出';updateLabel();toggle.onclick=()=>{paused=!paused;updateLabel();};
 function frame(ms){requestAnimationFrame(frame);if(document.hidden||!['home','menu'].includes(screen())){last=ms;return;}if(ms-last<33)return;const dt=Math.min(.06,(ms-last)/1000);last=ms;if(!paused)clock+=dt;
 if(!art.ready)return;if(!ready){const p=paper.getContext('2d');p.filter='saturate(.45) brightness(.72)';p.drawImage(art.paper,0,0,1440,900);ready=true;}
 c.drawImage(paper,0,0);const t=clock;
 const actors=[{x:930,y:548,scale:1.85,flip:1,color:'cinnabar',phase:0},{x:1270,y:600,scale:1.35,flip:-1,color:'jade',phase:1.7}];
 for(const a of actors){const u=t*.65+a.phase,n=manualControl();n.nodes[0]={x:-.3,y:.35+.3*Math.sin(u)};n.nodes[4]={x:.6,y:.55+.42*Math.sin(u+.8)};n.nodes[1].y=Math.max(0,Math.sin(u))*.28;n.nodes[3].y=Math.max(0,-Math.sin(u))*.28;n.wrist=Math.sin(u*.8)*.22;
 const p=poseFor(n,t,{},'solo');p.neck=Math.sin(u*.45)*.06;const x=a.x+Math.sin(u*.4)*12,y=a.y+Math.sin(u)*3;
 c.save();c.globalAlpha=.66;c.translate(x,y);c.scale(a.scale*a.flip,a.scale);art.puppet(c,p,t,false,{color:a.color,headdress:'plume'});c.restore();
 c.strokeStyle='#34241880';c.lineWidth=1.2;for(const q of [p.left[2],p.right[2],p.neckPoint]){c.beginPath();c.moveTo(x+q.x*a.scale*a.flip+35,0);c.lineTo(x+q.x*a.scale*a.flip,y+q.y*a.scale);c.stroke();}
 }
 c.fillStyle='#cfb67830';c.font='11px Pixel,monospace';for(let y=18;y<900;y+=22)for(let x=12;x<1440;x+=28)if((x*7+y)%9<3)c.fillText('01:+x'[(x+y)%5],x,y);
 const glow=c.createLinearGradient(0,0,1440,0);glow.addColorStop(0,'#211f18ee');glow.addColorStop(.42,'#28261fbb');glow.addColorStop(1,'#29241d15');c.fillStyle=glow;c.fillRect(0,0,1440,900);
 }
 requestAnimationFrame(frame);
}
