import type {AppState,RideDay,Session} from './domain.ts';

const soc=(n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=100;
export function assertSocData(state:AppState){
 for(const s of state.sessions)if(s.measurements.some(m=>!soc(m.soc))||(s.endSoc!=null&&!soc(s.endSoc)))throw new Error('Akkustände müssen ganze Zahlen von 0 bis 100 sein.');
 for(const d of state.rideDays??[])if(!soc(d.startSoc)||!soc(d.endSoc))throw new Error('Akkustände müssen ganze Zahlen von 0 bis 100 sein.');
}
export function duplicateRideDays(days:RideDay[]){return days.filter(d=>days.some(other=>other.id!==d.id&&other.bikeId===d.bikeId&&other.date===d.date));}
export function saveRideDay(state:AppState,day:RideDay):AppState{
 const previous=state.rideDays?.find(d=>d.id===day.id);
 if((state.rideDays??[]).some(d=>d.id!==day.id&&d.bikeId===day.bikeId&&d.date===day.date)&&(!previous||previous.bikeId!==day.bikeId||previous.date!==day.date))throw new Error('Für dieses Fahrrad und Datum existiert bereits ein Fahrtag. Bitte den vorhandenen Fahrtag bearbeiten.');
 if(new Set(day.sessionIds).size!==day.sessionIds.length)throw new Error('Eine Ladepause darf nur einmal zugeordnet werden.');
 for(const id of day.sessionIds)if((state.rideDays??[]).some(d=>d.id!==day.id&&d.sessionIds.includes(id))&&!previous?.sessionIds.includes(id))throw new Error('Diese Ladepause ist bereits einem anderen Fahrtag zugeordnet.');
 for(const id of day.sessionIds){
  const s=state.sessions.find(s=>s.id===id);
  if(!s||s.endedAt===undefined||!sameConfiguration({...day,socBasis:'combined'},s)||![s.startedAt,s.endedAt].some(t=>new Date(t).toLocaleDateString('sv-SE')===day.date))throw new Error('Eine Ladezuordnung passt nicht mehr zum Datum, Fahrrad oder zur Akkukonfiguration. Bitte prüfen und entfernen.');
 }
 if([day.startedAt,day.endedAt].some(t=>t!==undefined&&(!Number.isFinite(t)||new Date(t).toLocaleDateString('sv-SE')!==day.date)))throw new Error('Bitte gültige Fahrtzeiten am gewählten Datum eingeben.');
 if(day.startedAt!==undefined&&day.endedAt!==undefined&&day.endedAt<day.startedAt)throw new Error('Das Fahrtende darf nicht vor dem Fahrtbeginn liegen.');
 const next={...state,rideDays:[...(state.rideDays??[]).filter(d=>d.id!==day.id),day]};assertSocData(next);return next;
}
function sameConfiguration(day:RideDay,s:Session){
 const c=s.snapshot.configuration;
 return day.socBasis!=='unknown'&&c.id===day.configuration.id&&c.bikeId===day.bikeId&&s.snapshot.bike.id===day.bikeId&&JSON.stringify([...c.batteryIds].sort())===JSON.stringify([...day.configuration.batteryIds].sort());
}
export function dayBalance(day:RideDay,state:AppState){
 let charged=0;const excluded:string[]=[];
 for(const id of new Set(day.sessionIds)){
  const s=state.sessions.find(s=>s.id===id),first=s&&[...s.measurements].sort((a,b)=>a.measuredAt-b.measuredAt||a.recordedAt-b.recordedAt)[0];
  const sameDay=s&&[s.startedAt,s.endedAt].some(t=>t!==undefined&&new Date(t).toLocaleDateString('sv-SE')===day.date);
  const outside=s&&(day.startedAt!==undefined&&s.startedAt<day.startedAt||day.endedAt!==undefined&&(s.endedAt===undefined||s.endedAt>day.endedAt));
  if(!s||!sameDay||!sameConfiguration(day,s)||s.endedAt===undefined||s.isTest||s.endSoc==null||!first||!soc(s.endSoc)||!soc(first.soc)||s.measurements.some(m=>m.quality?.status==='flagged'||m.quality?.status==='unreviewed')||s.endSoc<first.soc||outside||(state.rideDays??[]).some(d=>d.id!==day.id&&d.sessionIds.includes(id))){excluded.push(id);continue;}
  charged+=s.endSoc-first.soc;
 }
 const duplicate=duplicateRideDays(state.rideDays??[]).some(d=>d.id===day.id);
 return {charged,consumed:day.startSoc+charged-day.endSoc,complete:excluded.length===0&&!day.isTest&&!duplicate&&day.socBasis!=='unknown',excluded};
}
export function regularRideDays(state:AppState){return (state.rideDays??[]).filter(d=>!d.isTest&&dayBalance(d,state).complete);}
