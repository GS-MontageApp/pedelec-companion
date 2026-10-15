import {validSoc, type Measurement, type Session} from './domain.ts';

// getRandomValues is available on HTTP as well. IDs identify local records,
// they are not authentication tokens. Do not depend on secure-context randomUUID.
export function createId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, v => v.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function localFields(timestamp: number) {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`};
}

export function measurementTimestamp(date: string, time: string, startedAt: number, capturedAt: number): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Bitte gib Datum und Uhrzeit vollständig ein.');
  const timestamp = new Date(`${date}T${time}:00`).getTime();
  const fields = localFields(timestamp);
  if (!Number.isFinite(timestamp) || fields.date !== date || fields.time !== time) throw new Error('Diese lokale Messzeit ist ungültig.');
  if (timestamp > capturedAt) throw new Error('Der Messzeitpunkt darf nicht in der Zukunft liegen.');
  // Minute-only input includes the start minute even if start has seconds.
  if (timestamp < Math.floor(startedAt / 60000) * 60000) throw new Error('Der Messzeitpunkt darf nicht vor dem Ladestart liegen.');
  return Math.max(timestamp, startedAt);
}

export function chronological(points: Measurement[]): Measurement[] {
  return [...points].sort((a,b) => a.measuredAt-b.measuredAt || a.recordedAt-b.recordedAt);
}

export function createMeasurement(soc: string, measuredAt: number, recordedAt: number): Measurement {
  if (!validSoc(soc)) throw new Error('Bitte gib einen ganzzahligen Akkustand zwischen 0 und 100 % ein.');
  return {id:createId(), soc:Number(soc), measuredAt, recordedAt, quality:{status:'valid',issues:[],checkedAt:recordedAt,ruleVersion:'soc-order-v1'}};
}

export function createSession(snapshot: Session['snapshot'], soc: string, now: number): Session {
  return {id:createId(),startedAt:now,snapshot:structuredClone(snapshot),measurements:[createMeasurement(soc,now,now)]};
}

export function checkCandidate(existing: Measurement[], candidate: Measurement) {
  const sorted = chronological([...existing,candidate]);
  const index = sorted.findIndex(m=>m.id===candidate.id);
  const priorHigher = sorted.slice(0,index).filter(m=>m.soc>candidate.soc).sort((a,b)=>b.soc-a.soc)[0];
  const laterLower = sorted.slice(index+1).find(m=>m.soc<candidate.soc);
  if (priorHigher) return `Dein bisheriger Akkustand lag bei ${priorHigher.soc} %. Du möchtest jetzt ${candidate.soc} % speichern. Während des Ladens sollte der Akkustand normalerweise nicht sinken.`;
  if (laterLower) return `Du möchtest ${candidate.soc} % rückwirkend speichern. Der spätere Messwert liegt bei ${laterLower.soc} %. Während des Ladens sollte der Akkustand normalerweise nicht sinken.`;
  return null;
}

export function insertMeasurement(existing: Measurement[], candidate: Measurement, confirmed: boolean): Measurement[] {
  if (checkCandidate(existing,candidate) && !confirmed) throw new Error('Bitte bestätige den auffälligen Akkustand oder korrigiere ihn.');
  const sorted = chronological([...existing,candidate]);
  return sorted.map((m,index)=>{
    const higher = sorted.slice(0,index).filter(p=>p.soc>m.soc).sort((a,b)=>b.soc-a.soc)[0];
    const issues = [...(m.quality?.issues??[])];
    if(higher && !issues.some(i=>i.code==='soc-decrease'&&i.relatedMeasurementId===higher.id)) issues.push({code:'soc-decrease',relatedMeasurementId:higher.id,message:`Akkustand niedriger als der frühere Wert ${higher.soc} %.`});
    // A backdated high value also needs explicit exclusion, not just its successor.
    if(m.id===candidate.id && confirmed && !issues.length) {
      const lower=sorted.slice(index+1).find(p=>p.soc<m.soc);
      if(lower) issues.push({code:'soc-decrease',relatedMeasurementId:lower.id,message:`Späterer Messwert ist niedriger (${lower.soc} %).`});
    }
    return {...m,quality:{status:issues.length?'flagged':m.quality?.status??'unreviewed',issues,checkedAt:candidate.recordedAt,ruleVersion:'soc-order-v1',...(m.quality?.confirmedAt!==undefined?{confirmedAt:m.quality.confirmedAt}:{}),...(confirmed&&issues.length&&m.quality?.confirmedAt===undefined?{confirmedAt:candidate.recordedAt}:{})} as Measurement['quality']};
  });
}

// Future forecasting must use this gate. Confirmation acknowledges an exception;
// it never clears flags. Legacy measurements without checks are excluded too.
export function forecastMeasurements(points: Measurement[]) {
  return chronological(points).filter(m=>m.quality?.status==='valid' && m.quality.issues.length===0);
}

export type FinishReading = {kind:'unknown'} | {kind:'reading';point:Measurement;confirmed:boolean} | {kind:'full';measurementId:string};

export function finishSession(session:Session,endedAt:number,reading:FinishReading):Session {
  if(session.endedAt!==undefined)throw new Error('Dieser Ladevorgang ist bereits abgeschlossen.');
  if(!Number.isFinite(endedAt)||endedAt<session.startedAt||session.measurements.some(m=>m.measuredAt>endedAt))throw new Error('Der Endzeitpunkt darf nicht vor den Messwerten liegen.');
  if(reading.kind==='unknown')return {...session,endedAt,endSoc:null};
  if(reading.kind==='full'){
    const point=session.measurements.find(m=>m.id===reading.measurementId);
    if(!point||point.soc!==100)throw new Error('Der 100-%-Messwert wurde nicht gefunden.');
    return {...session,endedAt,endSoc:100,endMeasurementId:point.id};
  }
  // Capture the actual confirmation time, including time spent in the warning.
  const point={...reading.point,measuredAt:endedAt,recordedAt:endedAt};
  if(!Number.isInteger(point.soc)||point.soc<0||point.soc>100)throw new Error('Bitte gib einen Akkustand zwischen 0 und 100 % ein.');
  const measurements=insertMeasurement(session.measurements,point,reading.confirmed);
  return {...session,endedAt,endSoc:point.soc,endMeasurementId:point.id,measurements};
}
