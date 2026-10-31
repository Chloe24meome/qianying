// Synthetic landmarks for the explicitly labelled, camera-free control tutorial.
export function demoHand(curls=[0,0,0,0,0],angle=0){
 const p=[{x:.5,y:.82,z:0}];
 const paths=[[[.42,.72],[.35,.66],[.29,.59],[.24,.54]],[[.43,.55],[.43,.4],[.43,.3],[.43,.22]],[[.5,.52],[.5,.34],[.5,.23],[.5,.15]],[[.57,.55],[.58,.39],[.59,.29],[.60,.22]],[[.64,.61],[.65,.49],[.66,.4],[.67,.32]]];
 paths.forEach((chain,i)=>{let prev={x:chain[0][0],y:chain[0][1],z:0};p.push(prev);for(let j=1;j<4;j++){const dx=chain[j][0]-chain[j-1][0],dy=chain[j][1]-chain[j-1][1],a=curls[i]*(j-1)*1.7;prev={x:prev.x+dx*Math.cos(a)-dy*Math.sin(a),y:prev.y+dx*Math.sin(a)+dy*Math.cos(a),z:0};p.push(prev);}});
 return p.map(q=>({x:.5+(q.x-.5)*Math.cos(angle)-(q.y-.52)*Math.sin(angle),y:.52+(q.x-.5)*Math.sin(angle)+(q.y-.52)*Math.cos(angle),z:0}));
}
