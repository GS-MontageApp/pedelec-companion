import type {Session} from './domain.ts';
import {chronological} from './charging.ts';
export {learningMeasurements} from './travel.ts';
// Our generic taper approximation, NOT a Bosch curve: extra time above 80/95%.
export function weightedSoc(soc:number){return Math.min(soc,80)+Math.max(0,Math.min(soc,95)-80)*1.5+Math.max(0,soc-95)*3;}
const clean=(s:Session)=>!s.startSocWarning&&s.measurements.length>0&&s.measurements.every(m=>m.quality?.status==='valid'&&m.quality.issues.length===0&&Number.isFinite(m.measuredAt)&&Number.isInteger(m.soc)&&m.soc>=0&&m.soc<=100)&&chronological(s.measurements).every((m,i,a)=>i===0||m.soc>=a[i-1].soc);
const signature=(s:Session)=>JSON.stringify([s.snapshot.bike.id,s.snapshot.bike.system,s.snapshot.configuration.id,[...s.snapshot.configuration.batteryIds].sort(),s.snapshot.batteries.map(b=>[b.id,b.nominalWh,b.soh??null]).sort(),s.snapshot.charger.id,s.snapshot.charger.amps]);
const median=(values:number[])=>{const a=[...values].sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
export type Forecast={targetSoc:100;endAt?:number;remainingMinutes?:number;overdue:boolean;source:'technical'|'history'|'none'|'documented-full';historyCount:number;explanation:string};
// Pure derivation. Never writes SOC, measurements, end state or database data.
export function chargeForecast(session:Session|undefined,history:Session[],now:number):Forecast {
 const none=(explanation:string):Forecast=>({targetSoc:100,overdue:false,source:'none',historyCount:0,explanation});
 if(!session)return none('Noch keine Schätzung möglich. Bitte zuerst eine Ladung mit bewusst eingegebenem Start-SOC starten.');
 if(session.endedAt!==undefined||!clean(session))return none('Noch keine Schätzung möglich: abgeschlossene Sitzung oder ungeprüfte/auffällige Messwerte.');
 const points=chronological(session.measurements),last=points.at(-1)!;
 if(last.measuredAt>now||points[0].measuredAt<session.startedAt)return none('Noch keine Schätzung möglich: Messzeitpunkte prüfen.');
 if(last.soc===100)return {targetSoc:100,overdue:false,source:'documented-full',historyCount:0,remainingMinutes:0,explanation:'100 % wurden manuell dokumentiert. Die Ladung läuft bis zu deinem ausdrücklichen Abschluss weiter.'};
 const rates=history.filter(s=>s.id!==session.id&&!s.isTest&&s.endedAt!==undefined&&s.endSoc===100&&clean(s)&&signature(s)===signature(session)).flatMap(s=>{
  const a=chronological(s.measurements),first=a[0],end=a.find(m=>m.id===s.endMeasurementId),full=a.find(m=>m.soc===100);
  // Actual first attainment of 100%, not a potentially much later unplug time.
  if(!end||end.soc!==100||!full||first.measuredAt!==s.startedAt||first.soc>80||full.measuredAt>s.endedAt!||full.measuredAt-first.measuredAt<20*60000)return [];
  return [(full.measuredAt-first.measuredAt)/(weightedSoc(100)-weightedSoc(first.soc))];
 });
 let msPerUnit:number,source:Forecast['source'],explanation:string,count=0;
 if(rates.length>=3&&Math.max(...rates)/Math.min(...rates)<=2){msPerUnit=median(rates);source='history';count=rates.length;explanation=`Schätzung aus ${count} passenden realen Vollladungen mit derselben Konfiguration und demselben Ladegerät. Generisches Auslaufmodell, keine Herstellerkennlinie.`;}
 else {
  const {bike,batteries,configuration,charger}=session.snapshot;
  // Existing Bosch system-2 setup: nominal 36-V basis. No voltage guessed for others.
  // Source: Bosch BCS220/230/250 manual, 0 275 007 XCX (2020.03), technical data.
  const known=/Bosch.*Nyon 2.*BUI350/i.test(bike.system)&&((charger.name==='Compact Charger'&&charger.amps===2)||(charger.name==='Fast Charger'&&charger.amps===6));
  const ids=batteries.map(b=>b.id);
  if(!known||!batteries.length||new Set(ids).size!==ids.length||JSON.stringify([...ids].sort())!==JSON.stringify([...configuration.batteryIds].sort())||batteries.some(b=>!Number.isFinite(b.nominalWh)||b.nominalWh<=0||b.soh!==undefined&&(!Number.isFinite(b.soh)||b.soh<=0||b.soh>100)))return none('Noch keine Schätzung möglich: technische Basis unbekannt und weniger als drei konsistente passende reale Vollladungen.');
  // SOH is a manual capacity proxy, not measured usable capacity. Pack total only;
  // no invented efficiency or simultaneous/sequential battery switching behaviour.
  const capacity=batteries.reduce((sum,b)=>sum+b.nominalWh*(b.soh??100)/100,0);
  msPerUnit=capacity/(36*charger.amps)*3600000/100;source='technical';
  explanation=`Grobe technische Schätzung: ${Math.round(capacity)} Wh Kapazitätsansatz (Nennwerte, vorhandener SOH berücksichtigt), 36 V × ${charger.amps} A, verlangsamter Auslauf ab 80/95 %. Keine gemessene Ladekurve. Temperatur, Verluste und Akku-Umschaltung unbekannt.${batteries.length>1?' Gesamtpaketmodell: keine Annahme paralleler oder sequenzieller Einzelakku-Ladung.':''}${batteries.some(b=>/demo/i.test(b.source))?' Akkudaten enthalten manuelle Beispielangaben; Setup vor Verwendung prüfen.':''}${session.isTest?' TEST: Diese Sitzung wird nicht als historische Lerngrundlage verwendet.':''}`;
 }
 const endAt=last.measuredAt+(weightedSoc(100)-weightedSoc(last.soc))*msPerUnit;
 if(!Number.isFinite(endAt))return none('Noch keine Schätzung möglich: technische Daten prüfen.');
 return {targetSoc:100,endAt,remainingMinutes:Math.max(0,Math.ceil((endAt-now)/60000)),overdue:now>=endAt,source,historyCount:count,explanation};
}
