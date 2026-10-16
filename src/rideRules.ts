import {assertRideResumptions,previousEndIds,type AppState,type RideDay,type Session} from './domain.ts';

import {temporalFit,journeyBalance} from './socJourney.ts';
const soc=(n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=100;
export function assertSocData(state:AppState){
 for(const s of state.sessions)if(s.measurements.some(m=>!soc(m.soc))||(s.endSoc!=null&&!soc(s.endSoc)))throw new Error('Akkustände müssen ganze Zahlen von 0 bis 100 sein.');
 if((state.rideDays??[]).filter(d=>d.status==='active').length>1)throw new Error('Es darf nur ein Fahrtag aktiv sein.');
 for(const day of state.rideDays??[]){
  assertRideResumptions(day);
  if(!day.status)continue;
  if(day.startedAt===undefined&&!day.resumptions?.length||day.status==='active'&&(day.endedAt!==undefined||day.endSoc!==undefined)||day.status==='completed'&&(day.endedAt===undefined||day.endSoc===undefined))throw new Error('Start-/Endzustand des Fahrtags ist unvollständig.');
  const points=day.socMeasurements??[],archived=previousEndIds(day);
  if((day.resumptions??[]).some(r=>r.previousEndPointIds.some(id=>!points.some(p=>p.id===id&&p.kind==='end'))))throw new Error('Ein früherer Abschlussmesspunkt fehlt.');
  if(new Set(points.map(p=>p.id)).size!==points.length||points.filter(p=>p.kind==='start').length!==(day.startedAt===undefined?0:1)||points.filter(p=>p.kind==='end'&&!archived.has(p.id)).length!==(day.status==='active'?0:1)||points.some(p=>!Number.isFinite(p.measuredAt)||!Number.isFinite(p.recordedAt)||p.measuredAt<day.startedAt!||day.endedAt!==undefined&&p.measuredAt>day.endedAt))throw new Error('Bitte die Messzeitpunkte innerhalb des Fahrtags prüfen.');
  if(points.some(p=>p.kind==='start'&&(p.soc!==day.startSoc||p.measuredAt!==day.startedAt)||p.kind==='end'&&!archived.has(p.id)&&(p.soc!==day.endSoc||p.measuredAt!==day.endedAt)))throw new Error('Start-/Endmesspunkt passt nicht zum Fahrtag.');
 }
 for(const d of state.rideDays??[])if(!soc(d.startSoc)||(d.status==='active'?d.endSoc!==undefined:!soc(d.endSoc))||(d.socMeasurements??[]).some(p=>!soc(p.soc)))throw new Error('Akkustände müssen ganze Zahlen von 0 bis 100 sein.');
}
export function duplicateRideDays(days:RideDay[]){return days.filter(d=>days.some(other=>other.id!==d.id&&other.bikeId===d.bikeId&&other.date===d.date));}
export function saveRideDay(state:AppState,day:RideDay):AppState{
 const previous=state.rideDays?.find(d=>d.id===day.id);
 if((state.rideDays??[]).some(d=>d.id!==day.id&&d.bikeId===day.bikeId&&d.date===day.date)&&(!previous||previous.bikeId!==day.bikeId||previous.date!==day.date))throw new Error('Für dieses Fahrrad und Datum existiert bereits ein Fahrtag. Bitte den vorhandenen Fahrtag bearbeiten.');
 if(new Set(day.sessionIds).size!==day.sessionIds.length)throw new Error('Eine Ladepause darf nur einmal zugeordnet werden.');
 for(const id of day.sessionIds)if((state.rideDays??[]).some(d=>d.id!==day.id&&d.sessionIds.includes(id))&&!previous?.sessionIds.includes(id))throw new Error('Diese Ladepause ist bereits einem anderen Fahrtag zugeordnet.');
 for(const id of day.sessionIds){
  const s=state.sessions.find(s=>s.id===id);
  if(!s||!sameConfiguration({...day,socBasis:'combined'},s)||(!previous?.sessionIds.includes(id)&&temporalFit(day,s)==='outside'))throw new Error('Eine Ladezuordnung passt nicht mehr zum Datum, Fahrrad oder zur Akkukonfiguration. Bitte prüfen und entfernen.');
 }
 if([day.startedAt,day.endedAt].some(t=>t!==undefined&&(!Number.isFinite(t)||(!day.status||t===day.startedAt)&&new Date(t).toLocaleDateString('sv-SE')!==day.date)))throw new Error('Bitte gültige Fahrtzeiten am gewählten Datum eingeben.');
 if(day.startedAt!==undefined&&day.endedAt!==undefined&&day.endedAt<day.startedAt)throw new Error('Das Fahrtende darf nicht vor dem Fahrtbeginn liegen.');
 if(day.status==='active'&&(state.rideDays??[]).some(d=>d.id!==day.id&&d.status==='active'))throw new Error('Es ist bereits ein Fahrtag aktiv.');
 const next={...state,rideDays:[...(state.rideDays??[]).filter(d=>d.id!==day.id),day]};assertSocData(next);return next;
}
function sameConfiguration(day:RideDay,s:Session){
 const c=s.snapshot.configuration;
 return day.socBasis!=='unknown'&&c.id===day.configuration.id&&c.bikeId===day.bikeId&&s.snapshot.bike.id===day.bikeId&&JSON.stringify([...c.batteryIds].sort())===JSON.stringify([...day.configuration.batteryIds].sort());
}
export function dayBalance(day:RideDay,state:AppState){const {charged,consumed,complete,excluded}=journeyBalance(day,state);return {charged,consumed,complete,excluded};}
export function regularRideDays(state:AppState){return (state.rideDays??[]).filter(d=>!d.isTest&&dayBalance(d,state).complete);}
