export function installWheel(){
 const select=document.getElementById('preview-action');select.closest('label').hidden=true;
 const wheel=document.createElement('div');wheel.className='motion-wheel';wheel.setAttribute('aria-label','预览动作，滚轮或上下方向键旋转，居中自动演出');wheel.tabIndex=0;
 document.querySelector('#stage-wrap').append(wheel);
 const options=[...select.options];let center=0,active=select.value,locked=false;
 const buttons=options.map((o,i)=>{const b=document.createElement('button');b.textContent=o.textContent;b.onclick=e=>{e.stopPropagation();if(i===center){select.value=o.value;select.dispatchEvent(new Event('change'));active=o.value;paint();}else turn(offset(i));};wheel.append(b);return b;});
 const offset=i=>((i-center+12)%8)-4;
 function paint(){buttons.forEach((b,i)=>{const d=offset(i),angle=d*Math.PI/4;b.style.transform=`translate(${45+145*(1-Math.cos(angle))}px,${170+145*Math.sin(angle)}px) translate(-50%,-50%)`;b.style.opacity=Math.abs(d)>1?'0':d===0?'1':'.45';b.style.pointerEvents=Math.abs(d)>1?'none':'auto';b.tabIndex=Math.abs(d)>1?-1:0;b.setAttribute('aria-hidden',String(Math.abs(d)>1));b.setAttribute('aria-pressed',String(options[i].value===active));b.classList.toggle('center',d===0);});}
 function turn(n){if(locked)return;center=(center+n+8)%8;locked=true;paint();setTimeout(()=>{locked=false;select.value=options[center].value;select.dispatchEvent(new Event('change'));active=select.value;paint();},320);}
 wheel.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();turn(Math.sign(e.deltaY));},{passive:false});wheel.onkeydown=e=>{if(['ArrowUp','ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='ArrowUp')turn(-1);else if(e.key==='ArrowDown')turn(1);else buttons[center].click();}};
 select.addEventListener('change',()=>{active=select.value;paint();});paint();
}

