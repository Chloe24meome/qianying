// Prefer an isolated worker, but support browsers whose workers cannot load the local runtime.
export async function createTrackingClient(report=()=>{},forceMain=false,maxHands=2){
 // A loaded page can remain visible after its local server has exited.
 // Check transport before blaming Worker support or requesting camera access.
 report('正在检查本地剧场服务与手势资源…');
 const resources=['vendor/vision_bundle.mjs','tracking-worker.js','vendor/hand_landmarker.task','vendor/wasm/vision_wasm_internal.js','vendor/wasm/vision_wasm_internal.wasm','vendor/wasm/vision_wasm_nosimd_internal.js','vendor/wasm/vision_wasm_nosimd_internal.wasm'];
 for(const resource of resources){
  let response;const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),6000);
  try{response=await fetch(new URL('./'+resource,location.href),{method:'HEAD',cache:'no-store',signal:abort.signal});}
  catch{throw new Error('本地剧场服务未连接或已停止。请重新双击 ASCII风格副本中的「启动ASCII皮影剧场.cmd」，然后按 Ctrl+F5 刷新页面再开启摄像头。当前无法访问：'+resource);}
  finally{clearTimeout(timeout);}
  if(!response.ok)throw new Error('本地手势资源缺失或无法读取：'+resource+'（HTTP '+response.status+'）。请重新启动 ASCII 副本；若仍失败，请运行模型诊断。');
  if(resource.endsWith('.mjs')&&!/javascript/.test(response.headers.get('content-type')||''))throw new Error('本地服务返回了错误的脚本类型。请关闭旧版剧场服务，重新运行 ASCII 副本启动器，再按 Ctrl+F5 刷新。');
 }
 let failure='';
 if(!forceMain&&typeof createImageBitmap==='function'){
  let worker;
  try{
   worker=new Worker('./tracking-worker.js');
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('Worker 初始化超时'));},18000);
    const cleanup=()=>{clearTimeout(timer);worker.onerror=null;worker.onmessage=null;};
    worker.onerror=e=>{e.preventDefault();cleanup();reject(new Error(e.message||'浏览器阻止了 Worker 启动'));};
    worker.onmessage=({data})=>{if(data.type==='ready'){cleanup();resolve();}else if(data.type==='error'){cleanup();reject(new Error(data.message));}};
    worker.postMessage({type:'init',maxHands});
   });
   worker.backend='worker';return worker;
  }catch(error){worker?.terminate();failure=error.message;report('独立线程不可用，正在尝试兼容识别模式…');}
 }
 try{
  const {HandLandmarker,FilesetResolver}=await import('./vendor/vision_bundle.mjs');
  const files=await FilesetResolver.forVisionTasks(new URL('./vendor/wasm',location.href).href);
  let detector;try{detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task',location.href).href,delegate:'GPU'},runningMode:'VIDEO',numHands:maxHands,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});}catch{detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task',location.href).href,delegate:'CPU'},runningMode:'VIDEO',numHands:maxHands,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});}
  let closed=false;
  const client={backend:'main',onmessage:null,onerror:null,
   postMessage(data){if(data.type!=='frame')return;setTimeout(()=>{try{if(closed)return;const r=detector.detectForVideo(data.frame,data.time);client.onmessage?.({data:{type:'result',landmarks:r.landmarks[0]||null,hands:r.landmarks}});}catch(error){client.onmessage?.({data:{type:'error',message:error.message}});}finally{data.frame.close?.();}},0);},
   terminate(){if(closed)return;closed=true;detector.close();}
  };return client;
 }catch(error){throw new Error(`手势模型启动失败。线程：${failure||'已选择兼容模式'}；兼容模式：${error.message}。请用外部 Chrome / Edge 打开本地剧场或运行模型诊断。`);}
}
