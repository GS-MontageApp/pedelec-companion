import {useEffect,useRef,useState} from 'react';

export default function PwaStatus({blockedReason=''}:{blockedReason?:string}){
 const [online,setOnline]=useState(navigator.onLine),[offlineReady,setOfflineReady]=useState(false),[needRefresh,setNeedRefresh]=useState(false),[error,setError]=useState('');
 const registrationRef=useRef<ServiceWorkerRegistration|undefined>(undefined),requested=useRef(false),blocked=useRef(blockedReason);
 blocked.current=blockedReason;
 useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  let disposed=false,previousController=navigator.serviceWorker.controller;
  const cleanups:(()=>void)[]=[];
  const check=()=>{if(navigator.onLine)void registrationRef.current?.update().catch(()=>{});};
  const onlineChanged=()=>{setOnline(navigator.onLine);if(navigator.onLine)check();};
  const visible=()=>{if(document.visibilityState==='visible')check();};
  const changed=()=>{
   if(previousController){
    setNeedRefresh(true);
    // Another tab may activate a worker. Never reload this tab without its own safe confirmation.
    if(requested.current&&!blocked.current)window.location.reload();
    else if(requested.current){requested.current=false;setError('Update ist bereit. Bitte den laufenden Vorgang zuerst abschließen.');}
   }
   previousController=navigator.serviceWorker.controller;
  };
  navigator.serviceWorker.addEventListener('controllerchange',changed);
  window.addEventListener('online',onlineChanged);window.addEventListener('offline',onlineChanged);window.addEventListener('focus',check);document.addEventListener('visibilitychange',visible);
  const interval=window.setInterval(check,60*60*1000);
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).then(registration=>{
   if(disposed)return;
   registrationRef.current=registration;
   if(registration.waiting&&navigator.serviceWorker.controller)setNeedRefresh(true);
   const observe=()=>{
    const worker=registration.installing;if(!worker)return;
    const changed=()=>{if(worker.state==='installed'){if(navigator.serviceWorker.controller)setNeedRefresh(true);else setOfflineReady(true);}};
    worker.addEventListener('statechange',changed);cleanups.push(()=>worker.removeEventListener('statechange',changed));changed();
   };
   registration.addEventListener('updatefound',observe);cleanups.push(()=>registration.removeEventListener('updatefound',observe));observe();check();
  }).catch(()=>{if(!disposed)setError('Offline-Modus konnte nicht eingerichtet werden. Bitte die Verbindung prüfen.');});
  return()=>{disposed=true;cleanups.forEach(fn=>fn());window.clearInterval(interval);navigator.serviceWorker.removeEventListener('controllerchange',changed);window.removeEventListener('online',onlineChanged);window.removeEventListener('offline',onlineChanged);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',visible);};
 },[]);
 async function update(){
  if(blocked.current){setError(blocked.current);return;}
  setError('');requested.current=true;
  const waiting=registrationRef.current?.waiting;
  if(waiting){waiting.postMessage({type:'SKIP_WAITING'});}
  else {window.location.reload();}
 }
 if(!online||offlineReady||needRefresh||error)return <aside className="pwa-status" aria-live="polite">{!online?'Offline · Daten bleiben auf diesem Gerät.':offlineReady?'Offline-Nutzung vorbereitet.':''}{error&&<span role="status">{error}</span>}{needRefresh&&<><strong>Neue Version verfügbar.</strong><span>{blockedReason||'Deine gespeicherten Daten bleiben erhalten. Du kannst die neue Version jetzt laden.'}</span><button type="button" className="secondary" disabled={!online||!!blockedReason} onClick={()=>void update()}>Gespeichert – jetzt aktualisieren</button></>}</aside>;
 return null;
}
