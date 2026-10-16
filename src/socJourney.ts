import {previousEndIds,type AppState,type RideDay,type Session,type SocIncreaseWarning} from './domain.ts';
export function samePack(day:Pick<RideDay,'bikeId'|'configuration'>,s:Session){const c=s.snapshot.configuration;return day.bikeId===s.snapshot.bike.id&&day.configuration.id===c.id&&day.configuration.bikeId===c.bikeId&&JSON.stringify([...day.configuration.batteryIds].sort())===JSON.stringify([...c.batteryIds].sort());}
const local=(n:number)=>new Date(n).toLocaleDateString('sv-SE');
export function temporalFit(day:RideDay,s:Session):'inside'|'uncertain'|'outside'{
 const end=s.endedAt??s.startedAt;
 if(day.startedAt!==undefined&&s.startedAt<day.startedAt||day.endedAt!==undefined&&end>day.endedAt)return 'outside';
 if(day.startedAt===undefined&&local(s.startedAt)!==day.date)return 'outside';
 const history=day.resumptions??[];
 if(history.some(r=>r.previousEndedAt!==undefined&&s.startedAt<r.resumedAt&&end>r.previousEndedAt))return 'uncertain';
 return day.startedAt!==undefined?'inside':'uncertain';
}
export function linkCandidates(state:AppState,s:Session){return (state.rideDays??[]).filter(d=>samePack(d,s)&&temporalFit(d,s)!=='outside'&&(d.endedAt===undefined?d.date===local(s.startedAt)||d.startedAt!==undefined:d.endedAt>=s.startedAt));}
export function owners(state:AppState,id:string){return (state.rideDays??[]).filter(d=>d.sessionIds.includes(id));}
export function autoLinkChangedCharges(previous:AppState,next:AppState):AppState{
 let result=next;
 for(const s of next.sessions){const old=previous.sessions.find(x=>x.id===s.id);if(old&&old.endedAt===s.endedAt||s.linkDecision==='standalone'||owners(result,s.id).length)continue;
  const candidates=linkCandidates(result,s),day=candidates[0];
  if(candidates.length===1&&day.status==='active'&&temporalFit(day,s)==='inside'&&!!day.isTest===!!s.isTest&&day.socBasis!=='unknown')result={...result,rideDays:result.rideDays!.map(d=>d.id===day.id?{...d,sessionIds:[...d.sessionIds,s.id]}:d)};
 }
 return result;
}
export function attachCharge(state:AppState,id:string,dayId:string):AppState{const s=state.sessions.find(s=>s.id===id),day=state.rideDays?.find(d=>d.id===dayId);if(!s||!day||!linkCandidates(state,s).some(d=>d.id===dayId))throw new Error('Die Ladung passt zeitlich oder zur Akkukonfiguration nicht zu diesem Fahrtag.');if(owners(state,id).some(d=>d.id!==dayId))throw new Error('Diese Ladung ist bereits einem anderen Fahrtag zugeordnet.');return {...state,rideDays:state.rideDays!.map(d=>d.id===dayId?{...d,sessionIds:[...new Set([...d.sessionIds,id])]}:d)};}
export function safeLinkedCharges(state:AppState,day:RideDay){return state.sessions.filter(s=>day.sessionIds.includes(s.id)&&owners(state,s.id).length===1&&samePack(day,s)&&temporalFit(day,s)!=='outside');}
export type JourneyEvent={id:string;at?:number;soc?:number;label:string;kind:'start'|'reading'|'end'|'previous-end'|'charge-start'|'charge-reading'|'charge-end'|'continue';sourceId:string;sessionId?:string;warning?:SocIncreaseWarning;delta?:number;associationIssue?:string};
export function journeyEvents(day:RideDay,state:AppState):JourneyEvent[]{
 const archived=previousEndIds(day),events:JourneyEvent[]=(day.socMeasurements??[]).map(p=>({id:`ride:${p.id}`,at:p.measuredAt,soc:p.soc,sourceId:p.id,kind:p.kind==='checkpoint'?'reading':p.kind==='end'&&archived.has(p.id)?'previous-end':p.kind,label:p.kind==='start'?'Fahrtbeginn':p.kind==='end'?(archived.has(p.id)?'Früherer Abschluss':'Fahrtende'):'SOC-Messung',warning:p.increaseWarning}));
 if(!events.some(e=>e.kind==='start'))events.unshift({id:`start:${day.id}`,at:day.startedAt,soc:day.startSoc,label:'Fahrtbeginn',kind:'start',sourceId:day.id});
 if(day.endSoc!==undefined&&!events.some(e=>e.kind==='end'))events.push({id:`end:${day.id}`,at:day.endedAt,soc:day.endSoc,label:'Fahrtende',kind:'end',sourceId:day.id,warning:day.manualEndWarning});
 for(const s of state.sessions.filter(s=>day.sessionIds.includes(s.id))){
  const points=[...s.measurements].sort((a,b)=>a.measuredAt-b.measuredAt||a.recordedAt-b.recordedAt),first=points[0];
  events.push({id:`charge-start:${s.id}`,at:s.startedAt,soc:first?.soc,label:'Zwischenladung beginnt',kind:'charge-start',sourceId:first?.id??s.id,sessionId:s.id,warning:s.startSocWarning});
  for(const p of points.filter(p=>p.id!==first?.id&&p.id!==s.endMeasurementId))events.push({id:`charge-reading:${p.id}`,at:p.measuredAt,soc:p.soc,label:'Lade-Zwischenstand',kind:'charge-reading',sourceId:p.id,sessionId:s.id});
  if(s.endedAt!==undefined){events.push({id:`charge-end:${s.id}`,at:s.endedAt,soc:s.endSoc??undefined,delta:s.endSoc!=null&&first?s.endSoc-first.soc:undefined,label:'Zwischenladung beendet',kind:'charge-end',sourceId:s.endMeasurementId??s.id,sessionId:s.id});if(s.endSoc!=null)events.push({id:`continue:${s.id}`,at:s.endedAt,soc:s.endSoc,label:'Weiterfahrt mit bekanntem SOC',kind:'continue',sourceId:s.endMeasurementId??s.id,sessionId:s.id});}
 }
 for(const e of events){if(!e.sessionId)continue;const s=state.sessions.find(s=>s.id===e.sessionId)!;if(!samePack(day,s)||temporalFit(day,s)==='outside'||owners(state,s.id).length>1)e.associationIssue='Zuordnung widersprüchlich: Fahrrad, Akkukonfiguration, Fahrtzeiten oder doppelte Zuordnung prüfen. Nicht in der Bilanz berücksichtigt.';}
 return events.map((e,i)=>({e,i})).sort((a,b)=>(a.e.at??(a.e.kind==='start'?-Infinity:Infinity))-(b.e.at??(b.e.kind==='start'?-Infinity:Infinity))||a.i-b.i).map(v=>v.e);
}
export function latestJourneySoc(day:RideDay,state:AppState,before=Infinity,excludeId?:string){
 const events=journeyEvents(day,state).filter(e=>e.soc!==undefined&&!e.associationIssue&&e.sourceId!==excludeId&&(e.at===undefined||e.at<=before));
 const lastResume=day.resumptions?.at(-1),newer=events.some(e=>e.at!==undefined&&e.at>=(lastResume?.resumedAt??Infinity)&&e.kind!=='previous-end');
 if(lastResume?.previousEndSoc!==undefined&&!newer&&lastResume.previousEndedAt===undefined)return {id:`resumed:${lastResume.id}`,soc:lastResume.previousEndSoc,at:undefined};
 const e=events.filter(e=>e.at!==undefined).at(-1)??events.at(-1);return e?{id:e.sourceId,soc:e.soc!,at:e.at}:undefined;
}
export function riseWarning(day:RideDay,state:AppState,value:number,at:number,kind:SocIncreaseWarning['kind']='ride-rise',excludeId?:string):Omit<SocIncreaseWarning,'confirmedAt'>|undefined{if(kind==='ride-rise'&&state.sessions.some(s=>day.sessionIds.includes(s.id)&&owners(state,s.id).length===1&&temporalFit(day,s)!=='outside'&&samePack(day,s)&&s.startedAt<=at&&(s.endedAt===undefined||at<s.endedAt)))return;const prior=latestJourneySoc(day,state,at,excludeId);return prior&&value>prior.soc?{kind,referenceId:prior.id,referenceSoc:prior.soc,...(prior.at!==undefined?{referenceAt:prior.at}:{}),enteredSoc:value}:undefined;}
export const riseMessage=(w:Omit<SocIncreaseWarning,'confirmedAt'>)=>`Zuletzt wurden ${w.referenceSoc} % dokumentiert. Du möchtest ${w.enteredSoc} % ${w.kind==='charge-start-rise'?'als Ladebeginn':'während der Fahrt'} speichern. Bitte prüfe den Akkustand. Möglicherweise war eine frühere Messung ungenau oder es fehlt ein Ladevorgang.`;
export function chargeStartWarning(state:AppState,snapshot:Session['snapshot'],value:number,at:number){
 const day=state.rideDays?.find(d=>d.status==='active'&&samePack(d,{snapshot} as Session));if(!day)return;
 const refs=(state.rideDays??[]).filter(d=>samePack(d,{snapshot} as Session)).map(d=>latestJourneySoc(d,state,at)).filter(r=>r!==undefined);
 for(const s of state.sessions.filter(s=>samePack(day,s))){for(const p of s.measurements.filter(p=>p.measuredAt<=at))refs.push({id:p.id,soc:p.soc,at:p.measuredAt});if(s.endSoc!=null&&s.endedAt!==undefined&&s.endedAt<=at)refs.push({id:s.endMeasurementId??s.id,soc:s.endSoc,at:s.endedAt});}
 refs.sort((a,b)=>(a.at??-Infinity)-(b.at??-Infinity));const current=latestJourneySoc(day,state,at),lastTimed=refs.filter(r=>r.at!==undefined).at(-1),boundary=day.resumptions?.at(-1)?.resumedAt??new Date(`${day.date}T00:00:00`).getTime(),prior=current&&current.at===undefined&&(!lastTimed||lastTimed.at!<=boundary)?current:refs.at(-1);
 if(prior&&value>prior.soc)return {kind:'charge-start-rise' as const,referenceId:prior.id,referenceSoc:prior.soc,...(prior.at!==undefined?{referenceAt:prior.at}:{}),enteredSoc:value};
}

export function journeyBalance(day:RideDay,state:AppState){let charged=0;const excluded:string[]=[];for(const id of new Set(day.sessionIds)){const s=state.sessions.find(s=>s.id===id),first=s&&[...s.measurements].sort((a,b)=>a.measuredAt-b.measuredAt||a.recordedAt-b.recordedAt)[0];if(!s||!samePack(day,s)||s.endedAt===undefined||s.endSoc==null||!first||s.endSoc<first.soc||s.isTest&&!day.isTest||temporalFit(day,s)==='outside'||s.measurements.some(m=>m.quality?.status==='flagged'||m.quality?.status==='unreviewed')||owners(state,id).length>1){excluded.push(id);continue;}charged+=s.endSoc-first.soc;}
 const pending=state.sessions.filter(s=>s.linkDecision!=='standalone'&&!owners(state,s.id).length&&linkCandidates(state,s).some(d=>d.id===day.id)).length;
 const duplicate=(state.rideDays??[]).some(d=>d.id!==day.id&&d.bikeId===day.bikeId&&d.date===day.date),warning=!!day.resumptions?.some(r=>r.previousEndWarning)||!!day.manualEndWarning||!!day.socMeasurements?.some(p=>p.increaseWarning)||state.sessions.some(s=>day.sessionIds.includes(s.id)&&s.startSocWarning),latest=latestJourneySoc(day,state),end=day.endSoc??latest?.soc;
 return {charged,excluded,duplicate,warning,pending,consumed:day.endSoc===undefined?undefined:day.startSoc+charged-day.endSoc,soFar:end===undefined?undefined:day.startSoc+charged-end,complete:day.status!=='active'&&day.endSoc!==undefined&&!day.isTest&&!duplicate&&day.socBasis!=='unknown'&&!warning&&!pending&&excluded.length===0};
}
