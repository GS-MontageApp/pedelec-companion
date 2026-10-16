import type {AppState,RideDay,RideSocPoint} from './domain.ts';
import {validSoc} from './domain.ts';
import {createId,localFields} from './charging.ts';
import {saveRideDay} from './rideRules.ts';
export const activeRide=(state:AppState)=>state.rideDays?.find(d=>d.status==='active');
export const ridePoints=(day:RideDay)=>[...(day.socMeasurements??[])].sort((a,b)=>a.measuredAt-b.measuredAt||a.recordedAt-b.recordedAt||((day.socMeasurements??[]).indexOf(a)-(day.socMeasurements??[]).indexOf(b)));
function point(value:string,kind:RideSocPoint['kind'],now:number):RideSocPoint{if(!validSoc(value)||!Number.isFinite(now)||now<0)throw new Error('Bitte einen ganzen Akkustand von 0 bis 100 eingeben.');return {id:createId(),soc:Number(value),kind,measuredAt:now,recordedAt:now};}
export function startRide(state:AppState,bikeId:string,value:string,now=Date.now(),isTest=false):AppState{
 if(activeRide(state))throw new Error('Es ist bereits ein Fahrtag aktiv. Bitte diesen zuerst beenden.');
 const date=localFields(now).date,c=state.catalog!,configuration=c.configurations.find(c=>c.bikeId===bikeId&&c.validFrom<=date&&(!c.validUntil||date<c.validUntil));
 if(!configuration||!c.bikes.some(b=>b.id===bikeId))throw new Error('Für dieses Fahrrad fehlt eine gültige Akkukonfiguration.');
 const first=point(value,'start',now);
 return saveRideDay(state,{id:createId(),date,bikeId,configuration:structuredClone(configuration),batteries:structuredClone(c.batteries.filter(b=>configuration.batteryIds.includes(b.id))),startSoc:first.soc,status:'active',startedAt:now,notes:'',sessionIds:[],socBasis:'combined',isTest,socMeasurements:[first]});
}
function find(state:AppState,id:string){const day=state.rideDays?.find(d=>d.id===id);if(!day)throw new Error('Fahrtag nicht gefunden.');return day;}
function timestamp(day:RideDay,stamp:number,now:number){if(!Number.isFinite(stamp)||stamp<(day.startedAt??0)||stamp>now||day.endedAt!==undefined&&stamp>day.endedAt)throw new Error('Der Messzeitpunkt muss innerhalb des Fahrtags und darf nicht in der Zukunft liegen.');}
export function captureRideSoc(state:AppState,id:string,value:string,note='',now=Date.now()):AppState{const day=find(state,id);if(day.status!=='active')throw new Error('Dieser Fahrtag ist bereits abgeschlossen.');timestamp(day,now,now);return saveRideDay(state,{...day,socMeasurements:[...(day.socMeasurements??[]),{...point(value,'checkpoint',now),note}]});}
export function endRide(state:AppState,id:string,value:string,now=Date.now()):AppState{const day=find(state,id);if(day.status!=='active')throw new Error('Dieser Fahrtag ist nicht aktiv.');timestamp(day,now,now);const end=point(value,'end',now);return saveRideDay(state,{...day,status:'completed',endSoc:end.soc,endedAt:now,socMeasurements:[...(day.socMeasurements??[]),end]});}
export function correctRideSoc(state:AppState,id:string,pointId:string,value:string,measuredAt:number,note='',now=Date.now()):AppState{const day=find(state,id),old=day.socMeasurements?.find(p=>p.id===pointId);if(!old||old.kind!=='checkpoint')throw new Error('Start- und Endwerte bitte im Fahrtag bearbeiten.');timestamp(day,measuredAt,now);const next={...old,soc:point(value,'checkpoint',now).soc,measuredAt,note,updatedAt:now};return saveRideDay(state,{...day,socMeasurements:day.socMeasurements!.map(p=>p.id===pointId?next:p)});}
export function deleteRideSoc(state:AppState,id:string,pointId:string):AppState{const day=find(state,id);if(!day.socMeasurements?.some(p=>p.id===pointId&&p.kind==='checkpoint'))throw new Error('Nur Zwischenmessungen können einzeln gelöscht werden.');return saveRideDay(state,{...day,socMeasurements:day.socMeasurements.filter(p=>p.id!==pointId)});}
export type Tab='Reisen'|'Laden'|'Daten'|'Einstellungen';
export function openingTab(state:AppState,last:string|null,shortcut=false):Tab{if(shortcut)return 'Reisen';if(state.sessions.some(s=>s.endedAt===undefined))return 'Laden';if(activeRide(state))return 'Reisen';return last==='Reisen'||last==='Laden'||last==='Einstellungen'||last==='Daten'&&state.showDataNav!==false?last:'Laden';}
export function syncRideEndpoints(day:RideDay):RideDay{if(!day.socMeasurements)return day;return {...day,socMeasurements:day.socMeasurements.map(p=>p.kind==='start'?{...p,soc:day.startSoc,measuredAt:day.startedAt??p.measuredAt}:p.kind==='end'?{...p,soc:day.endSoc??p.soc,measuredAt:day.endedAt??p.measuredAt}:p)};}
