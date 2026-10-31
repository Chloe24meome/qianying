export const TRACK_HOLD_MS=900;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class HandTracks {
 constructor(){this.reset();}
 reset(){this.slots=[null,null];}
 update(hands,time,duel=false){
  const valid=(hands||[]).filter(h=>h?.length===21&&h.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  const count=duel?2:1,result=[null,null];
  // Overlapping detections cannot establish ownership reliably. Keep the last pose.
  if(duel&&valid.length>1&&distance(valid[0][9],valid[1][9])<.075)return result;
  const costs=Array.from({length:count},(_,i)=>valid.map(h=>{
   const old=this.slots[i],x=1-h[9].x;
   if(duel&&(i===0?x>=.49:x<=.51))return Infinity;
   if(!old||time-old.time>1500){
    if(duel&&(i===0?x>=.46:x<=.54))return Infinity;
    const candidates=valid.filter(p=>!duel||(i===0?1-p[9].x<.46:1-p[9].x>.54));
    return candidates.length===1?.24:Infinity;
   }
   const elapsed=Math.max(0,time-old.time),horizon=elapsed>150?0:Math.min(elapsed,50);
   const predicted={x:old.points[9].x+old.vx*horizon,y:old.points[9].y+old.vy*horizon};
   if(distance(h[9],old.points[9])>.30)return Infinity;
   return distance(h[9],predicted);
  }));
  // Compare complete assignments, not greedy edges: detector array order is not identity.
  const plans=[];
  const visit=(i,ids,used,cost)=>{
   if(i===count){plans.push({ids,cost});return;}
   visit(i+1,[...ids,-1],used,cost+.32);
   valid.forEach((_,j)=>{if(!used.has(j)&&Number.isFinite(costs[i][j]))visit(i+1,[...ids,j],new Set([...used,j]),cost+costs[i][j]);});
  };
  visit(0,[],new Set(),0);plans.sort((a,b)=>a.cost-b.cost);
  const best=plans[0];
  for(let i=0;i<count;i++){
   const j=best.ids[i];if(j<0)continue;
   // Do not guess when one visible hand could belong to either player.
   if(duel&&plans.some(p=>p.ids[i]!==j&&p.cost-best.cost<.035))continue;
   result[i]=valid[j];
  }
  result.forEach((h,i)=>{if(!h)return;const old=this.slots[i],dt=old?time-old.time:0;
   const velocity=axis=>old&&dt>0&&dt<200?Math.max(-.002,Math.min(.002,(h[9][axis]-old.points[9][axis])/dt)):0;
   this.slots[i]={points:h,time,vx:velocity('x'),vy:velocity('y')};
  });return result;
 }
 held(time){return this.slots.map(s=>s&&time-s.time<TRACK_HOLD_MS?s.points:null);}
}

