import {useEffect,useState} from 'react';
import type {AppState} from './domain';
import {readState} from './persistence';
import App from './App';
export default function Bootstrap(){
 const [state,setState]=useState<AppState|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let alive=true;setError('');readState().then(s=>{if(alive)setState(s);}).catch(e=>{if(alive)setError(`Daten konnten nicht aus IndexedDB gelesen werden: ${e instanceof Error?e.message:'Unbekannter Fehler'}`);});return()=>{alive=false;};},[attempt]);
 if(state)return <App initialState={state}/>;
 return <main className="bootstrap"><h1>Pedelec Companion</h1>{error?<><p role="alert" className="notice">{error} Vorhandene Daten werden nicht zurückgesetzt. Bitte Browser-Speicher freigeben und erneut versuchen.</p><button className="primary" onClick={()=>setAttempt(v=>v+1)}>Erneut versuchen</button></>:<p role="status">Deine lokalen Daten werden geladen …</p>}</main>;
}
