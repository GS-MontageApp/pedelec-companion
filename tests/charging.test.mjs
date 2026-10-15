import 'fake-indexeddb/auto';
import {CompanionDB} from '../src/database.ts';
import {initialState} from '../src/persistence.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createId,createSession,createMeasurement,localFields,measurementTimestamp,checkCandidate,insertMeasurement,forecastMeasurements,chronological} from '../src/charging.ts';
import {bikes,batteries,chargers,configurations,elapsed,validSoc} from '../src/domain.ts';
import {saveState} from '../src/persistence.ts';

const point=(soc,t)=>createMeasurement(String(soc),t,t+10);
test('HTTP regression: session creation works with randomUUID absent',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)}});
  try {
    assert.equal(globalThis.crypto.randomUUID,undefined);
    const session=createSession({bike:bikes[0],configuration:configurations[0],batteries:batteries.slice(0,2),charger:chargers[0]},'32',1234);
    assert.equal(session.measurements[0].soc,32);
    assert.equal(session.startedAt,1234);
    assert.notEqual(session.id,session.measurements[0].id);
    assert.match(createId(),/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    assert.notEqual(session.snapshot.bike,bikes[0]);
  } finally {Object.defineProperty(globalThis,'crypto',descriptor);}
});
test('SOC only accepts integers from 0 to 100',()=>{
  for(const value of ['0','12','100'])assert.equal(validSoc(value),true);
  for(const value of ['','-1','101','10.2','x',' 2'])assert.equal(validSoc(value),false);
  assert.throws(()=>point(101,0));
});
test('local time input uses HH:mm and preserves a full timestamp',()=>{
  const start=new Date(2026,9,14,10,0,45,123).getTime(),now=start+20*60000;
  const fields=localFields(start);
  assert.deepEqual(fields,{date:'2026-10-14',time:'10:00'});
  assert.equal(measurementTimestamp(fields.date,fields.time,start,now),start);
  assert.equal(measurementTimestamp(fields.date,'10:05',start,now),new Date(2026,9,14,10,5).getTime());
  assert.throws(()=>measurementTimestamp(fields.date,'09:59',start,now),/vor dem Ladestart/);
  assert.throws(()=>measurementTimestamp(fields.date,'10:21',start,now),/Zukunft/);
  for(const invalid of ['10:00:12','25:00',''])assert.throws(()=>measurementTimestamp(fields.date,invalid,start,now));
  assert.throws(()=>measurementTimestamp('2026-02-30','10:00',start,now),/ungültig/);
});
test('backdated points and midnight use selected local calendar date',()=>{
  const start=new Date(2026,9,13,23,50).getTime(),now=new Date(2026,9,14,0,15).getTime();
  assert.equal(measurementTimestamp('2026-10-13','23:55',start,now),start+5*60000);
  assert.equal(measurementTimestamp('2026-10-14','00:05',start,now),start+15*60000);
  assert.throws(()=>measurementTimestamp('2026-10-14','23:55',start,now),/Zukunft/);
});
test('12 -> 22 -> 12 requires confirmation and stays flagged after confirmation',()=>{
  const first=point(12,100),second=point(22,200),candidate=point(12,300);
  assert.match(checkCandidate([second,first],candidate),/22 %.*12 %/);
  assert.throws(()=>insertMeasurement([second,first],candidate,false),/bestätige/);
  const saved=insertMeasurement([second,first],candidate,true);
  assert.equal(saved[2].quality.status,'flagged');
  assert.equal(saved[2].quality.confirmedAt,candidate.recordedAt);
  assert.deepEqual(forecastMeasurements(saved).map(m=>m.soc),[12,22]);
});
test('retroactive insertion checks both earlier and later points, not entry order',()=>{
  const first=point(12,100),last=point(22,300);
  assert.equal(checkCandidate([last,first],point(18,200)),null);
  const high=point(30,200);
  assert.match(checkCandidate([last,first],high),/spätere Messwert.*22 %/);
  const saved=insertMeasurement([last,first],high,true);
  assert.deepEqual(saved.map(m=>m.soc),[12,30,22]);
  assert.deepEqual(saved.map(m=>m.quality.status),['valid','flagged','flagged']);
  assert.match(checkCandidate([last,first],point(10,200)),/12 %/);
  assert.equal(checkCandidate([last,first],point(22,400)),null);
});
test('an earlier high value still requires warning after an already flagged decrease',()=>{
  const saved=insertMeasurement([point(12,100),point(22,200)],point(12,300),true);
  assert.match(checkCandidate(saved,point(18,400)),/22 %/);
});
test('legacy, unreviewed, flagged and future rapid-rise issues cannot enter forecasting',()=>{
  const legacy={...point(20,100),quality:undefined};
  const rapid=point(90,200);rapid.quality.issues=[{code:'rapid-rise',relatedMeasurementId:legacy.id,message:'Spätere Regel'}];
  assert.deepEqual(forecastMeasurements([legacy,rapid]),[]);
});
test('timestamp-based stopwatch survives editor time and does not depend on ticks',()=>{
  assert.equal(elapsed(1000,3662000),'01:01:01');
  assert.equal(elapsed(1000,500),'00:00:00');
  assert.deepEqual(chronological([point(30,300),point(10,100)]).map(m=>m.soc),[10,30]);
});
test('same timestamps preserve entry order instead of sorting random IDs',()=>{
  const first={...point(12,100),id:'z',recordedAt:100},second={...point(22,100),id:'a',recordedAt:100};
  assert.deepEqual(chronological([first,second]).map(m=>m.id),['z','a']);
});
test('IndexedDB errors reject without reporting success',async()=>{
 const database=new CompanionDB('failure-'+crypto.randomUUID());database.close();
 await assert.rejects(saveState(initialState(),database));
});
