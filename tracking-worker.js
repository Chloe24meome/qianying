let detector;
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){
   const {HandLandmarker,FilesetResolver}=await import('./vendor/vision_bundle.mjs');
   const files=await FilesetResolver.forVisionTasks(new URL('./vendor/wasm',self.location.href).href);
   try{detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task',self.location.href).href,delegate:'GPU'},runningMode:'VIDEO',numHands:data.maxHands===1?1:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});}catch{detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numHands:data.maxHands===1?1:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});}
   self.postMessage({type:'ready',maxHands:2});
  }else if(data.type==='frame'){
   try{const result=detector.detectForVideo(data.frame,data.time);self.postMessage({type:'result',landmarks:result.landmarks[0]||null,hands:result.landmarks});}finally{data.frame.close();}
  }
 }catch(error){self.postMessage({type:'error',message:error.message});}
};
