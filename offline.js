const RELEASE=new URL(import.meta.url).searchParams.get('v'),button=document.querySelector('#offline-download'),status=document.querySelector('#offline-status'),install=document.querySelector('#offline-install');
let registration,busy=false,installed=false,installPrompt;
function message(worker,type,timeout=15000){return new Promise((resolve,reject)=>{
 if(!worker){reject(Error('离线服务尚未就绪'));return;}
 const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('离线检查超时，请重试'));},timeout);
 channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};worker.postMessage({type,version:RELEASE},[channel.port2]);
});}
function show(text){status.textContent=text;}
function idle(){busy=false;button.disabled=false;button.textContent=installed?'检查更新 / 修复资源':'下载完整离线资源';}
async function check(){
 if(registration?.waiting){
  const info=await message(registration.waiting,'STATUS');
  if(info.ready){busy=false;button.disabled=false;button.textContent='启用新版并重新打开';show('新版已完整下载。点击启用会重新打开游戏。');return;}
 }
 if(registration?.active){
  const info=await message(registration.active,'STATUS');installed=info.ready;
  if(installed){show('离线资源已准备好 · v'+info.version+' · 全部角色、地图、图鉴和声音均可断网使用。');install.hidden=matchMedia('(display-mode: standalone)').matches;registration.active.postMessage({type:'CLEANUP',version:RELEASE});}
  else show('离线资源不完整，请联网下载或修复后再断网。');
 }
 idle();
}
function observe(worker){
 if(!worker)return;
 worker.addEventListener('statechange',()=>{
  if(worker.state==='activated'||worker.state==='installed')check().catch(error=>{show(error.message);idle();});
  if(worker.state==='redundant'){show('下载未完成，请保持联网后重试。已有离线版本和游戏记录会保留。');idle();}
 });
}
navigator.serviceWorker?.addEventListener('message',event=>{
 const data=event.data;if(data?.type!=='offline-progress')return;
 if(data.error){show(data.error);idle();return;}
 show(data.downloaded?'完整资源已下载，正在准备离线启动…':'正在下载离线资源 '+Math.round(data.done/data.total*100)+'% · '+data.done+'/'+data.total+' 项');
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(installed)install.hidden=false;});
window.addEventListener('appinstalled',()=>{install.hidden=true;show('已添加到桌面。以后可从桌面图标断网启动。');});
install.onclick=async()=>{
 if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}
 else show('请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。若没有此项，仍可用当前浏览器打开原网址离线玩。');
};
button.onclick=async()=>{
 if(busy)return;
 if(!navigator.onLine&&installed&&!registration?.waiting){show('当前离线，已下载的版本可以直接游玩；需要更新时再联网。');return;}
 if(registration?.waiting){
  busy=true;button.disabled=true;
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
  registration.waiting.postMessage({type:'ACTIVATE'});return;
 }
 busy=true;button.disabled=true;show('正在准备完整离线资源，请保持联网…');
 // Persistent storage is best-effort; its denial must not prevent offline play.
 navigator.storage?.persist?.().catch(()=>{});
 try{
  registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
  registration.addEventListener('updatefound',()=>observe(registration.installing));observe(registration.installing);
  if(registration.installing)return;
  if(registration.waiting){busy=false;await check();return;}
  await registration.update();
  if(registration.installing)return;
  if(registration.active){const result=await message(registration.active,'REPAIR',180000);if(!result.ready)throw Error(result.error||'离线资源未下载完整');}
  await check();
 }catch(error){show('暂未完成离线准备。请检查网络或可用空间后重试。');idle();}
};
if(!('serviceWorker' in navigator)||!isSecureContext){button.disabled=true;show('当前浏览器不支持离线安装，请用支持此功能的浏览器打开 HTTPS 网址。');}
else navigator.serviceWorker.getRegistration('./').then(async reg=>{
 registration=reg;if(reg){observe(reg.installing);reg.addEventListener('updatefound',()=>observe(reg.installing));await check();}
}).catch(()=>{show('暂时无法读取离线资源，仍可在线游玩；稍后点击下载重试。');});

const offlinePanel=document.querySelector('#offline-panel'),audioPanel=document.querySelector('#audio-settings');
if(offlinePanel){
 offlinePanel.addEventListener('toggle',()=>{if(offlinePanel.open&&audioPanel)audioPanel.open=false;});
 audioPanel?.addEventListener('toggle',()=>{if(audioPanel.open)offlinePanel.open=false;});
 document.addEventListener('click',e=>{if(!offlinePanel.contains(e.target))offlinePanel.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&offlinePanel.open){offlinePanel.open=false;offlinePanel.querySelector('summary').focus();e.preventDefault();e.stopImmediatePropagation();}},true);
}
