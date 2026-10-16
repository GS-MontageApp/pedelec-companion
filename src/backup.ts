import {z} from 'zod';
import type {AppState} from './domain.ts';
import {initialState} from './persistence.ts';
import {compatibleCharge,komootLink} from './travel.ts';
const id=z.string().min(1).max(200),text=z.string().max(10000),num=z.number().finite(),stamp=num.min(0),soc=num.int().min(0).max(100),pct=num.min(0).max(100);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;});
const bike=z.object({id,name:text,manufacturer:text,system:text}).strict();
const battery=z.object({id,name:text,nominalWh:num.positive(),soh:pct.optional(),cycles:num.int().nonnegative().optional(),kilometers:num.nonnegative().optional(),recordedAt:date,source:text}).strict();
const charger=z.object({id,name:text,amps:num.positive()}).strict();
const config=z.object({id,bikeId:id,batteryIds:z.array(id).min(1),validFrom:date,validUntil:date.optional()}).strict();
const quality=z.object({status:z.enum(['valid','flagged','unreviewed']),issues:z.array(z.object({code:z.enum(['soc-decrease','rapid-rise']),relatedMeasurementId:id,message:text,deltaSoc:num.optional(),elapsedMs:num.nonnegative().optional(),ratePercentPerHour:num.optional()}).strict()),checkedAt:stamp,ruleVersion:z.literal('soc-order-v1'),confirmedAt:stamp.optional()}).strict();
const point=z.object({id,soc,measuredAt:stamp,recordedAt:stamp,quality:quality.optional()}).strict();
const session=z.object({id,startedAt:stamp,endedAt:stamp.optional(),endSoc:soc.nullable().optional(),endMeasurementId:id.optional(),isTest:z.boolean().optional(),snapshot:z.object({bike,configuration:config,batteries:z.array(battery).min(1),charger}).strict(),measurements:z.array(point).min(1)}).strict();
const gpx=z.object({distanceKm:num.nonnegative(),ascentM:num.nonnegative().optional(),descentM:num.nonnegative().optional(),startedAt:stamp.optional(),endedAt:stamp.optional(),elapsedMs:num.nonnegative().optional(),pauseMs:num.nonnegative(),pauseCount:num.int().nonnegative(),pointCount:num.int().min(2),discardedPoints:num.int().nonnegative(),warnings:z.array(text),algorithm:z.literal('gpx-v1')}).strict();
const ride=z.object({id,date,bikeId:id,configuration:config,batteries:z.array(battery).min(1),startSoc:soc,endSoc:soc.optional(),status:z.enum(['active','completed']).optional(),socMeasurements:z.array(z.object({id,soc,measuredAt:stamp,recordedAt:stamp,updatedAt:stamp.optional(),kind:z.enum(['start','checkpoint','end']),note:text.optional()}).strict()).optional(),notes:text,sessionIds:z.array(id),isTest:z.boolean().optional(),startedAt:stamp.optional(),endedAt:stamp.optional(),socBasis:z.enum(['combined','unknown']).optional()}).strict();
const dataSchema=z.object({activeBikeId:id,chargerId:id,showDataNav:z.boolean().optional(),revision:num.int().nonnegative().optional(),catalog:z.object({bikes:z.array(bike).min(1),batteries:z.array(battery).min(1),chargers:z.array(charger).min(1),configurations:z.array(config).min(1)}).strict(),sessions:z.array(session),rideDays:z.array(ride),tourLinks:z.array(z.object({id,rideDayId:id,url:z.string().optional(),komootId:z.string().regex(/^\d+$/).optional(),gpx:gpx.optional()}).strict()),boschStats:z.array(z.object({id,rideDayId:id,motorPercent:pct.optional(),riderPercent:pct.optional(),averageRiderWatts:num.nonnegative().optional(),modes:z.object({Eco:pct.optional(),Tour:pct.optional(),Sport:pct.optional(),eMTB:pct.optional(),Turbo:pct.optional()}).strict(),loadNotes:text.optional(),source:z.literal('manuell')}).strict())}).strict();
const schema=z.object({app:z.literal('pedelec-companion'),version:z.literal(1),exportedAt:z.string().datetime(),data:dataSchema}).strict();
const fail=(message:string):never=>{throw new Error(message);};
function unique(rows:{id:string}[]){if(new Set(rows.map(r=>r.id)).size!==rows.length)fail('Doppelte IDs in der Sicherung.');}
export function validateData(value:unknown):AppState {
  const checked=dataSchema.safeParse(value);if(!checked.success)throw new Error('Die Datei enthält ungültige oder unvollständige Datenfelder.');
  const d=checked.data,c=d.catalog;
  [c.bikes,c.batteries,c.chargers,c.configurations,d.sessions,d.rideDays,d.tourLinks,d.boschStats,d.sessions.flatMap(s=>s.measurements),d.rideDays.flatMap(r=>r.socMeasurements??[])].forEach(unique);
  if(!c.bikes.some(b=>b.id===d.activeBikeId)||!c.chargers.some(c=>c.id===d.chargerId)||d.sessions.filter(s=>s.endedAt===undefined).length>1)fail('Ungültige aktive Auswahl oder mehrere laufende Sitzungen.');
  const validPack=(conf:typeof c.configurations[number],bs:typeof c.batteries)=>conf.batteryIds.length===new Set(conf.batteryIds).size&&conf.batteryIds.every(id=>bs.some(b=>b.id===id));
  for(const conf of c.configurations)if(!c.bikes.some(b=>b.id===conf.bikeId)||!validPack(conf,c.batteries)||conf.validUntil&&conf.validUntil<conf.validFrom)fail('Ungültige Akkukonfiguration.');
  for(const b of c.bikes)if(c.configurations.filter(cf=>cf.bikeId===b.id&&!cf.validUntil).length!==1)fail('Ein Fahrrad benötigt genau eine aktuelle Konfiguration.');
  for(const s of d.sessions){
    if(s.snapshot.configuration.bikeId!==s.snapshot.bike.id||!validPack(s.snapshot.configuration,s.snapshot.batteries))fail('Ungültiger Sitzungs-Snapshot.');
    if(s.endedAt!==undefined&&s.endedAt<s.startedAt||s.measurements.some(m=>m.measuredAt<s.startedAt||m.recordedAt<m.measuredAt||s.endedAt!==undefined&&m.measuredAt>s.endedAt))fail('Ungültige Mess-/Endzeitpunkte.');
    if(s.endedAt===undefined&&(s.endSoc!==undefined||s.endMeasurementId!==undefined))fail('Laufende Sitzung mit Abschlusswert.');
    const final=s.measurements.find(m=>m.id===s.endMeasurementId);
    if(s.endSoc!=null&&(!final||final.soc!==s.endSoc)||s.endMeasurementId&&(!final||s.endSoc==null))fail('Endwert und Abschlussmesspunkt passen nicht zusammen.');
    for(const m of s.measurements)if(m.quality?.issues.some(i=>!s.measurements.some(p=>p.id===i.relatedMeasurementId)))fail('Eine Auffälligkeit verweist auf einen fehlenden Messpunkt.');
  }
  if(d.rideDays.filter(r=>r.status==='active').length>1)fail('Mehrere aktive Fahrtage.');
  const used=new Set<string>();
  for(const day of d.rideDays){
    if(day.status==='active'?(day.endSoc!==undefined||day.endedAt!==undefined):day.endSoc===undefined)fail('Ungültiger Abschlusszustand des Fahrtags.');
    if(day.status&&day.startedAt===undefined||day.status==='completed'&&day.endedAt===undefined)fail('Fahrtag ohne Start-/Endzeit.');
    const points=day.socMeasurements??[];
    if(points.some(p=>p.measuredAt<(day.startedAt??0)||day.endedAt!==undefined&&p.measuredAt>day.endedAt||p.updatedAt!==undefined&&p.updatedAt<p.recordedAt))fail('Ungültiger Fahrtag-Messzeitpunkt.');
    if(day.status&&(points.filter(p=>p.kind==='start').length!==1||points.filter(p=>p.kind==='end').length!==(day.status==='active'?0:1)))fail('Start-/Endmessungen fehlen oder sind doppelt.');
    for(const p of points)if(p.kind==='start'&&(p.soc!==day.startSoc||p.measuredAt!==day.startedAt)||p.kind==='end'&&(p.soc!==day.endSoc||p.measuredAt!==day.endedAt))fail('Start-/Endmesspunkt passt nicht zum Fahrtag.');
if([day.startedAt,day.endedAt].some(t=>t!==undefined&&(!day.status||t===day.startedAt)&&new Date(t).toLocaleDateString('sv-SE')!==day.date)||day.startedAt!==undefined&&day.endedAt!==undefined&&day.endedAt<day.startedAt)fail('Ungültige Fahrtzeiten.');if(!c.bikes.some(b=>b.id===day.bikeId)||day.configuration.bikeId!==day.bikeId||!validPack(day.configuration,day.batteries))fail('Ungültiger Fahrtag.');
    for(const id of day.sessionIds){const s=d.sessions.find(s=>s.id===id);if(!s||!compatibleCharge(day,s)||used.has(id))fail('Ladepause ist nicht eindeutig oder passt nicht zum Fahrtag.');used.add(id);}}
  for(const t of d.tourLinks){if(!d.rideDays.some(r=>r.id===t.rideDayId))fail('Tour ohne Fahrtag.');if(t.url){const parsed=komootLink(t.url);if(t.komootId!==parsed.id)fail('Komoot-Link und Tour-ID passen nicht zusammen.');}else if(t.komootId)fail('Komoot-ID ohne Link.');}
  const statsDays=new Set<string>();
  for(const s of d.boschStats){if(!d.rideDays.some(r=>r.id===s.rideDayId)||statsDays.has(s.rideDayId))fail('Bosch-Statistik ohne eindeutigen Fahrtag.');statsDays.add(s.rideDayId);if(s.motorPercent!==undefined&&s.riderPercent!==undefined&&Math.abs(s.motorPercent+s.riderPercent-100)>0.1||Object.values(s.modes).reduce((a,b)=>a+(b??0),0)>100.1)fail('Prozentanteile der Bosch-Tagesstatistik sind nicht plausibel.');}
  return d;
}
export function exportBackup(state:AppState):string {
  const data=validateData({...initialState(),...state});
  return JSON.stringify({app:'pedelec-companion',version:1,exportedAt:new Date().toISOString(),data},null,2);
}
export function parseBackup(input:string):AppState {
  if(input.length>10_000_000)throw new Error('Sicherung zu groß (maximal 10 MB).');
  let raw:unknown;try{raw=JSON.parse(input);}catch{throw new Error('Keine gültige JSON-Datei.');}
  const result=schema.safeParse(raw);if(!result.success)throw new Error('Ungültige Sicherung oder nicht unterstützte Schema-Version (erwartet: 1).');
  return validateData(result.data.data);
}
