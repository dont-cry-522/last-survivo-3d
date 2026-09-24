// Orientation lock must start from a tap, after entering browser fullscreen.
export function setupMobileDisplay({onChange,onUnavailable}){
 const button=document.querySelector('#landscape'),help=document.querySelector('#orientation-help');
 let locked=false,wasFullscreen=!!document.fullscreenElement;
 button.hidden=!(matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0);
 function sync(){
  const fullscreen=!!document.fullscreenElement;
  if(wasFullscreen&&!fullscreen){screen.orientation?.unlock?.();locked=false;}
  wasFullscreen=fullscreen;
  button.textContent=fullscreen?'退出全屏':locked?'取消横屏':'横屏';
  button.setAttribute('aria-pressed',String(fullscreen||locked));
  if(innerWidth>innerHeight){help.hidden=true;document.querySelector('.orientation-note')?.remove();}
  onChange();
 }
 button.addEventListener('click',async()=>{
  button.disabled=true;help.hidden=true;onChange();
  try{
   if(document.fullscreenElement||locked){
    screen.orientation?.unlock?.();locked=false;
    if(document.fullscreenElement)await document.exitFullscreen();
   }else{
    // Fullscreen may be unavailable in embedded browsers; still try orientation
    // lock because installed web apps can allow it without fullscreen.
    try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}
    try{
     if(!screen.orientation?.lock)throw new Error('Orientation lock unavailable');
     await screen.orientation.lock('landscape');locked=true;
    }catch{
     if(innerWidth<=innerHeight){
      help.querySelector('span').textContent='浏览器未允许自动横屏。请打开手机「自动旋转」，关闭「竖屏锁定」，再将手机横过来；也可以在手机浏览器中打开本页重试。';
      help.hidden=false;onUnavailable();
     }
    }
   }
  }catch{
   help.querySelector('span').textContent='暂时无法退出全屏，请使用手机返回键退出。';
   help.hidden=false;onUnavailable();
  }finally{button.disabled=false;sync();}
 });
 help.querySelector('button').addEventListener('click',()=>{help.hidden=true;});
 document.addEventListener('fullscreenchange',sync);
 screen.orientation?.addEventListener('change',sync);
 window.addEventListener('resize',sync);
}
