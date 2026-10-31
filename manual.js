import {clamp} from './engine.js';
export const POINT_NAMES=['左手','左脚','头部','右脚','右手'];
export function manualControl(source={}){
 return {...source,x:.5,y:.5,wrist:source.wrist||0,wristLeft:source.wristLeft||0,fingers:[.65,.95,.95,.65],nodes:source.nodes?source.nodes.map(p=>({...p})):Array.from({length:5},(_,i)=>({x:0,y:i===2?.7:0}))};
}
export function movePoint(control,index,dx,dy){const p=control.nodes[index];p.x=clamp(p.x+dx,-2,2);p.y=clamp(p.y+dy,-2,2);return control;}
export function filterValue(current,target,dt,rate=5,dead=.01){const d=target-current;if(Math.abs(d)<=dead)return current;const step=Math.min(.04,Math.max(0,dt));return current+clamp((d-Math.sign(d)*dead)*(1-Math.exp(-28*step)),-rate*step,rate*step);}
export function cameraFailure(error){return ({NotAllowedError:'摄像头权限被拒绝。请在浏览器地址栏允许摄像头，并检查 Windows 设置 → 隐私和安全性 → 摄像头；内置预览无法授权时，请用外部 Chrome / Edge 打开本页。',NotFoundError:'未检测到摄像头设备。请连接摄像头并检查 Windows 是否识别。',NotReadableError:'摄像头无法读取：可能被会议软件占用、驱动异常或 Windows 隐私设置阻止。请关闭其他使用摄像头的软件后重试。',OverconstrainedError:'摄像头不支持所请求的画面规格，请更换设备重试。',SecurityError:'当前浏览器限制了摄像头访问，请用外部 Chrome / Edge 打开本地网址。',AbortError:'摄像头启动被中断，请重试。'})[error.name]||error.message||'摄像头启动失败，请重试。';}

export function responsiveValue(current,target,dt){
 const d=target-current,step=clamp(dt,0,.04),dead=.006;
 if(Math.abs(d)<=dead)return current;
 const speed=28+Math.min(62,Math.abs(d)*100);
 return current+(d-Math.sign(d)*dead)*(1-Math.exp(-speed*step));
}
