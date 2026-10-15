import {useEffect,useState} from 'react';
import {useRegisterSW} from 'virtual:pwa-register/react';
export default function PwaStatus(){
 const [online,setOnline]=useState(navigator.onLine),[error,setError]=useState('');
 const {offlineReady:[offlineReady],needRefresh:[needRefresh],updateServiceWorker}=useRegisterSW({onRegisterError(){setError('Offline-Modus konnte nicht eingerichtet werden. Bitte die Verbindung prüfen und neu laden.');},onRegisteredSW(_url,registration){if(!registration)return;const check=()=>{if(navigator.onLine)void registration.update().catch(()=>{});};window.addEventListener('focus',check);window.addEventListener('online',check);setInterval(check,60*60*1000);}});
 useEffect(()=>{const change=()=>setOnline(navigator.onLine);window.addEventListener('online',change);window.addEventListener('offline',change);return()=>{window.removeEventListener('online',change);window.removeEventListener('offline',change);};},[]);
 if(!online||offlineReady||needRefresh||error)return <aside className="pwa-status" aria-live="polite">{!online?'Offline · Daten bleiben auf diesem Gerät.':offlineReady?'Offline-Nutzung vorbereitet.':''}{error&&<span>{error}</span>}{needRefresh&&<><strong>Neue Version verfügbar.</strong><span>Bitte offene Eingaben zuerst speichern oder schließen. Der Ladevorgang wird aus IndexedDB wiederhergestellt.</span><button className="secondary" onClick={()=>{if(document.querySelector('.app')?.getAttribute('aria-busy')==='true'){setError('Speichern läuft noch. Bitte danach aktualisieren.');return;}void updateServiceWorker(true).catch(()=>setError('Update fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.'));}}>Gespeichert – jetzt aktualisieren</button></>}</aside>;
 return null;
}
