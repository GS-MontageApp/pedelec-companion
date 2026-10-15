import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession,createMeasurement,finishSession,insertMeasurement,forecastMeasurements} from '../src/charging.ts';
import {bikes,batteries,chargers,configurations} from '../src/domain.ts';
import {sessionSummary} from '../src/history.ts';
const session=()=>createSession({bike:bikes[0],configuration:configurations[0],batteries:batteries.slice(0,2),charger:chargers[0]},'22',1000);

test('known final SOC creates a final reading at actual completion time and preserves snapshot',()=>{
  const active=session(),before=structuredClone(active),point=createMeasurement('80',2000,2000);
  const result=finishSession(active,5000,{kind:'reading',point,confirmed:false});
  assert.equal(result.endedAt,5000);assert.equal(result.endSoc,80);
  assert.equal(result.measurements.length,2);assert.equal(result.endMeasurementId,point.id);
  assert.equal(sessionSummary(result).end.measuredAt,5000);
  assert.equal(sessionSummary(result).end.recordedAt,5000);
  assert.deepEqual(result.snapshot,before.snapshot);assert.deepEqual(active,before);
  assert.throws(()=>finishSession(result,6000,{kind:'unknown'}),/bereits abgeschlossen/);
});
test('unknown final SOC invents no measurement, keeps flags and last reading distinct',()=>{
  const active=session();active.measurements=insertMeasurement(active.measurements,createMeasurement('12',2000,2000),true);
  const before=structuredClone(active);
  const result=finishSession(active,5000,{kind:'unknown'});
  assert.equal(result.endSoc,null);assert.equal(result.endMeasurementId,undefined);
  assert.deepEqual(result.measurements,before.measurements);
  assert.equal(sessionSummary(result).end,undefined);
  assert.deepEqual(active,before);
});
test('falling final SOC needs explicit confirmation and remains excluded from forecast',()=>{
  const active=session(),point=createMeasurement('12',2000,2000);
  assert.throws(()=>finishSession(active,3000,{kind:'reading',point,confirmed:false}),/bestätige/);
  assert.equal(active.endedAt,undefined);assert.equal(active.measurements.length,1);
  const result=finishSession(active,5000,{kind:'reading',point,confirmed:true});
  const final=sessionSummary(result).end;
  assert.equal(result.endSoc,12);assert.equal(final.quality.status,'flagged');
  assert.equal(final.quality.confirmedAt,5000);assert.equal(final.measuredAt,5000);
  assert.equal(forecastMeasurements(result.measurements).some(m=>m.id===point.id),false);
});
test('full checkpoint remains active until confirmation; confirmation reuses the same measurement',()=>{
  const active=session(),point=createMeasurement('100',2000,2000);
  active.measurements=insertMeasurement(active.measurements,point,false);
  const before=structuredClone(active);
  assert.equal(active.endedAt,undefined);
  const result=finishSession(active,5000,{kind:'full',measurementId:point.id});
  assert.equal(result.endSoc,100);assert.equal(result.endedAt,5000);
  assert.equal(result.endMeasurementId,point.id);
  assert.deepEqual(result.measurements,before.measurements);
  assert.equal(sessionSummary(result).end.measuredAt,2000);
  assert.deepEqual(active,before);
  assert.throws(()=>finishSession(active,5000,{kind:'full',measurementId:active.measurements[0].id}),/100/);
});
test('zero final SOC is recorded, and invalid readings/end times are rejected',()=>{
  const active=session();
  const result=finishSession(active,5000,{kind:'reading',point:createMeasurement('0',4000,4000),confirmed:true});
  assert.equal(result.endSoc,0);assert.equal(sessionSummary(result).end.soc,0);
  assert.throws(()=>finishSession(active,500,{kind:'unknown'}));
  assert.throws(()=>finishSession(active,5000,{kind:'reading',point:{...createMeasurement('1',4000,4000),soc:101},confirmed:true}));
});
test('another confirmed final anomaly preserves previous confirmation timestamps',()=>{
  const active=session();active.measurements=insertMeasurement(active.measurements,createMeasurement('12',2000,2000),true);
  const result=finishSession(active,5000,{kind:'reading',point:createMeasurement('10',4000,4000),confirmed:true});
  assert.equal(result.measurements[1].quality.confirmedAt,2000);
  assert.equal(result.measurements[2].quality.confirmedAt,5000);
});
test('legacy completed sessions keep all data and never infer a final SOC',()=>{
  const legacy={...session(),endedAt:5000},before=JSON.stringify(legacy);
  const summary=sessionSummary(legacy);
  assert.equal(summary.end,undefined);assert.equal(legacy.endSoc,undefined);
  assert.equal(summary.points.length,1);assert.equal(JSON.stringify(legacy),before);
});
