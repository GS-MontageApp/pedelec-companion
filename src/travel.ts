import {XMLParser,XMLValidator} from 'fast-xml-parser';
import type {AppState,GpxSummary,RideDay,Session} from './domain.ts';
import {chronological,forecastMeasurements} from './charging.ts';

export function komootLink(input:string):{url:string;id?:string} {
  let u:URL;try{u=new URL(input.trim());}catch{throw new Error('Bitte einen vollständigen Komoot-Freigabelink eingeben.');}
  if(u.protocol!=='https:'||u.username||u.password||!['komoot.com','www.komoot.com','komoot.de','www.komoot.de','komoot.app'].includes(u.hostname))throw new Error('Nur HTTPS-Freigabelinks von Komoot sind erlaubt.');
  const match=u.pathname.match(/\/(?:tour|tours|t)\/(\d+)(?:\/|$)/);
  if(match)return {url:u.href,id:match[1]};
  if(u.hostname==='komoot.app'&&/^\/\S+$/.test(u.pathname))return {url:u.href};
  throw new Error('Keine Tour-ID im Link gefunden. Unterstützt werden /tour/, /tours/ und /t/ mit numerischer ID.');
}
export function testSuggestion(session:Session):string|null {
  if(session.endedAt!==undefined&&session.endedAt-session.startedAt<120000)return 'Sehr kurz (unter 2 Minuten) – möglicherweise ein Test.';
  if(session.measurements.some(m=>m.quality?.status==='flagged'))return 'Auffällige Messwerte – bitte prüfen, ob dies ein Testlauf war.';
  return null;
}
export function learningMeasurements(session:Session){
  if(session.isTest)return [];
  const sorted=chronological(session.measurements);
  return forecastMeasurements(sorted).filter(m=>!sorted.slice(0,sorted.findIndex(p=>p.id===m.id)).some(p=>p.soc>m.soc));
}
export function compatibleCharge(day:Pick<RideDay,'date'|'bikeId'|'configuration'>,s:Session) {
  const local=(n:number)=>new Date(n).toLocaleDateString('sv-SE');
  return s.endedAt!==undefined&&s.snapshot.bike.id===day.bikeId&&s.snapshot.configuration.id===day.configuration.id&&[local(s.startedAt),local(s.endedAt)].includes(day.date);
}
export {dayBalance} from './rideRules.ts';
export function chargeSuggestions(day:RideDay,state:AppState){
 return state.sessions.filter(s=>compatibleCharge(day,s)||day.sessionIds.includes(s.id)).map(session=>({session,
  usedElsewhere:(state.rideDays??[]).some(d=>d.id!==day.id&&d.sessionIds.includes(session.id)),
  withinRide:day.startedAt!==undefined&&day.endedAt!==undefined&&session.startedAt>=day.startedAt&&session.endedAt!==undefined&&session.endedAt<=day.endedAt}));
}
type Point={lat:number;lon:number;ele?:number;time?:number};
const haversine=(a:Point,b:Point)=>{const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2)));};
const list=<T,>(v:T|T[]|undefined):T[]=>v===undefined?[]:Array.isArray(v)?v:[v];
export function analyzeGpx(xml:string):GpxSummary {
  if(xml.length>10_000_000)throw new Error('GPX-Datei zu groß (maximal 10 MB).');
  if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw new Error('Ungültige GPX-Datei. DTDs und externe Entitäten sind nicht erlaubt.');
  const root=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false}).parse(xml).gpx;
  if(!root)throw new Error('Keine GPX-Datei erkannt.');
  const segments=[...list<any>(root.trk).flatMap(t=>list<any>(t.trkseg).map(s=>list<any>(s.trkpt))),...list<any>(root.rte).map(r=>list<any>(r.rtept))];
  if(segments.flat().length>200000)throw new Error('Zu viele GPS-Punkte (maximal 200.000).');
  let distance=0,ascent=0,descent=0,elevationPairs=0,pauseMs=0,pauseCount=0,count=0,discarded=0,firstTime:number|undefined,lastTime:number|undefined,nonMonotonic=0,missingTime=0,missingElevation=0;
  for(const segment of segments){let previous:Point|undefined,anchor:Point|undefined,pauseDuration=0;
    const flushPause=()=>{if(pauseDuration>=120000){pauseMs+=pauseDuration;pauseCount++;}pauseDuration=0;};
    for(const raw of segment){
      const lat=Number(raw['@_lat']),lon=Number(raw['@_lon']);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){discarded++;continue;}
      const ele=raw.ele!==undefined&&String(raw.ele).trim()!==''?Number(raw.ele):undefined;
      const t=raw.time&&/(Z|[+-]\d{2}:\d{2})$/.test(String(raw.time))?Date.parse(raw.time):NaN;
      const p:Point={lat,lon,ele:Number.isFinite(ele)?ele:undefined,time:Number.isFinite(t)?t:undefined};
      if(previous){const d=haversine(previous,p),dt=p.time!==undefined&&previous.time!==undefined?p.time-previous.time:undefined;
        if((dt!==undefined&&dt>0&&d/(dt/1000)>25)||(d>5000&&dt===undefined)){discarded++;continue;}
        distance+=d;
        if(p.ele!==undefined&&anchor?.ele!==undefined){const delta=p.ele-anchor.ele;if(Math.abs(delta)>=3){if(Math.abs(delta)<=100+2*d){ascent+=Math.max(0,delta);descent+=Math.max(0,-delta);elevationPairs++;}anchor=p;}}
        else anchor=p;
        if(dt!==undefined&&dt<=0){nonMonotonic++;flushPause();}
        else if(dt!==undefined&&dt>=120000&&d<30){pauseDuration+=dt;}
        else if(dt!==undefined&&dt>0&&d/dt*1000<0.5){pauseDuration+=dt;}
        else flushPause();
      }else anchor=p;
      if(p.time!==undefined){firstTime=firstTime===undefined?p.time:Math.min(firstTime,p.time);lastTime=lastTime===undefined?p.time:Math.max(lastTime,p.time);}else missingTime++;
      if(p.ele===undefined)missingElevation++;
      previous=p;count++;
    }flushPause();
  }
  if(count<2)throw new Error('Mindestens zwei gültige GPS-Punkte werden benötigt.');
  const warnings=['Näherungswerte: Höhenfilter 3 m; GPS-Sprünge über 90 km/h bzw. 5 km ohne Zeit verworfen. Pausen: mindestens 2 Minuten unter 0,5 m/s; Datenlücken können wie Pausen wirken.'];
  if(discarded)warnings.push(`${discarded} GPS-Ausreißer/ungültige Punkte verworfen.`);
  if(nonMonotonic)warnings.push('Nicht chronologische Zeitstempel; Pausenauswertung eingeschränkt.');
  if(missingTime)warnings.push('Zeitstempel fehlen teilweise oder vollständig; Zeitspanne/Pausen unvollständig.');
  if(missingElevation)warnings.push('Höhenwerte fehlen teilweise oder vollständig.');
  return {distanceKm:distance/1000,...(elevationPairs||missingElevation===0?{ascentM:ascent,descentM:descent}:{}),...(firstTime!==undefined?{startedAt:firstTime,endedAt:lastTime,elapsedMs:lastTime!-firstTime}:{}),pauseMs,pauseCount,pointCount:count,discardedPoints:discarded,warnings,algorithm:'gpx-v1'};
}
