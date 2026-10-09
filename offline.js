const RELEASE=new URL(import.meta.url).searchParams.get('v'),button=document.querySelector('#offline-download'),status=document.querySelector('#offline-status'),install=document.querySelector('#offline-install');
let registration,busy=false,installed=false,installPrompt,checking=false;
const observed=new WeakSet(),watched=new WeakSet(),summary=document.querySelector('#offline-panel summary');
function message(worker,type,timeout=15000){return new Promise((resolve,reject)=>{
 if(!worker){reject(Error('离线服务尚未就绪'));return;}
 const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('离线检查超时，请重试'));},timeout);
 channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};worker.postMessage({type,version:RELEASE},[channel.port2]);
});}
function show(text){status.textContent=text;}
function label(text='下载 / 离线'){if(summary)summary.textContent=text;}
function idle(){busy=false;button.disabled=false;button.textContent=installed?'检查更新 / 修复资源':'下载完整离线资源';}
function networkWait(promise){let timer;return Promise.race([promise,new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('更新检查超时')),12000);})]).finally(()=>clearTimeout(timer));}
async function check(){
 if(registration?.waiting){
  const info=await message(registration.waiting,'STATUS');
  if(info.ready){busy=false;button.disabled=false;button.textContent='启用新版并重新打开';label('下载 / 离线 · 新版 v'+info.version);show('新版 v'+info.version+' 已完整下载。回到大厅后点击启用，游戏记录会保留。');return;}
 }
 if(registration?.installing){busy=true;button.disabled=true;button.textContent='正在准备新版离线资源';label('下载 / 离线 · 更新中');return;}
 label();
 if(registration?.active){
  const info=await message(registration.active,'STATUS');installed=info.ready;
  if(installed){show('离线资源已准备好 · v'+info.version+' · 全部角色、地图、图鉴和声音均可断网使用。');install.hidden=matchMedia('(display-mode: standalone)').matches;registration.active.postMessage({type:'CLEANUP',version:RELEASE});}
  else show('离线资源不完整，请联网下载或修复后再断网。');
 }
 idle();
}
function observe(worker){
 if(!worker||observed.has(worker))return;observed.add(worker);
 worker.addEventListener('statechange',()=>{
  if(worker.state==='activated'||worker.state==='installed')check().catch(error=>{show(error.message);idle();});
  if(worker.state==='redundant'){show('下载未完成，请保持联网后重试。已有离线版本和游戏记录会保留。');label();idle();}
 });
}
function watch(reg){
 registration=reg;if(!reg||watched.has(reg))return;watched.add(reg);
 observe(reg.installing);reg.addEventListener('updatefound',()=>{observe(reg.installing);check().catch(()=>{});});
}
async function checkInstalledUpdate(){
 if(!registration||!navigator.onLine||checking||registration.installing||registration.waiting)return;
 checking=true;
 try{
  await networkWait(registration.update());
  await check();
 }catch{
  if(!registration.installing&&!registration.waiting){show(installed?'更新检查暂未完成，已下载的版本仍可游玩；稍后可在这里重试。':'暂时无法检查更新，请联网后点击下载或修复资源。');idle();}
 }finally{checking=false;}
}
navigator.serviceWorker?.addEventListener('message',event=>{
 const data=event.data;if(data?.type!=='offline-progress')return;
 if(data.error){show(data.error);label();idle();return;}
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
  if(document.body.classList.contains('playing')){show('新版已准备好。请先结束本局并返回大厅，再启用更新。');return;}
  busy=true;button.disabled=true;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!document.body.classList.contains('playing'))location.reload();else{show('新版已启用。当前对局不会刷新，返回大厅后重新打开即可。');idle();}},{once:true});
  registration.waiting.postMessage({type:'ACTIVATE'});return;
 }
 busy=true;button.disabled=true;show('正在准备完整离线资源，请保持联网…');
 // Persistent storage is best-effort; its denial must not prevent offline play.
 navigator.storage?.persist?.().catch(()=>{});
 try{
  watch(await networkWait(navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'})));
  if(registration.installing)return;
  if(registration.waiting){busy=false;await check();return;}
  await networkWait(registration.update());
  if(registration.installing)return;
  if(registration.active){const result=await message(registration.active,'REPAIR',180000);if(!result.ready)throw Error(result.error||'离线资源未下载完整');}
  await check();
 }catch(error){show('暂未完成离线准备。请检查网络或可用空间后重试。');idle();}
};
if(!('serviceWorker' in navigator)||!isSecureContext){button.disabled=true;show('当前浏览器不支持离线安装，请用支持此功能的浏览器打开 HTTPS 网址。');}
else navigator.serviceWorker.getRegistration('./').then(async reg=>{
 watch(reg);if(reg){await check();await checkInstalledUpdate();}
}).catch(()=>{show('暂时无法读取离线资源，仍可在线游玩；稍后点击下载重试。');});
window.addEventListener('online',()=>{checkInstalledUpdate();});

const offlinePanel=document.querySelector('#offline-panel'),audioPanel=document.querySelector('#audio-settings');
if(offlinePanel){
 offlinePanel.addEventListener('toggle',()=>{if(offlinePanel.open&&audioPanel)audioPanel.open=false;});
 audioPanel?.addEventListener('toggle',()=>{if(audioPanel.open)offlinePanel.open=false;});
 document.addEventListener('click',e=>{if(!offlinePanel.contains(e.target))offlinePanel.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&offlinePanel.open){offlinePanel.open=false;offlinePanel.querySelector('summary').focus();e.preventDefault();e.stopImmediatePropagation();}},true);
}
