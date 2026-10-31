import {clamp} from './engine.js';
import {aimPaddle} from './rig.js';
export const LEVELS=[
 {name:'入门',reaction:.30,rate:.65,error:28,miss:.18,shots:['稳推']},
 {name:'休闲',reaction:.22,rate:.85,error:19,miss:.12,shots:['稳推','高吊']},
 {name:'标准',reaction:.15,rate:1.1,error:12,miss:.07,shots:['稳推','高吊','快拨']},
 {name:'高手',reaction:.09,rate:1.4,error:7,miss:.035,shots:['稳推','高吊','快拨','切削']},
 {name:'大师',reaction:.05,rate:1.7,error:3,miss:.015,shots:['稳推','高吊','快拨','切削','突击']}
];
export const SHOTS={稳推:{speed:255,height:390},高吊:{speed:215,height:350},快拨:{speed:305,height:400},切削:{speed:270,height:365},突击:{speed:345,height:405}};
// Random choices are made once per incoming shot, never every animation frame.
export class MatchAI{
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.incoming=false;this.returns=0;this.elapsed=0;this.error=0;this.shot='稳推';this.aim=null;}
 update(current,ball,dt,level=3,right=true){
  const cfg=LEVELS[clamp(level-1,0,4)],incoming=right?ball.vx>0:ball.vx<0;
  if(!incoming){this.incoming=false;return current;}
  if(!this.incoming){this.incoming=true;this.returns++;this.elapsed=0;this.aim=null;this.error=(this.random()*2-1)*cfg.error;const fatigue=Math.max(0,this.returns-3);if(this.random()<Math.min(.65,cfg.miss+fatigue*.065))this.error+=(this.random()<.5?-1:1)*(85+Math.min(65,fatigue*12));this.shot=cfg.shots[Math.floor(this.random()*cfg.shots.length)];}
  this.elapsed+=dt;if(this.elapsed<cfg.reaction)return current;
  const target=aimPaddle({...ball,y:ball.y+this.error},right);
  const delta=target.y-current.y,step=Math.min(dt,.04);
  const y=Math.abs(delta)<.008?current.y:current.y+clamp(delta*(1-Math.exp(-10*step)),-cfg.rate*step,cfg.rate*step);
  return {...target,y};
 }
}
