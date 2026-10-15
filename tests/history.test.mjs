import 'fake-indexeddb/auto';
import {CompanionDB} from '../src/database.ts';
import {initialState} from '../src/persistence.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completedSessions,sessionSummary} from '../src/history.ts';
import {createSession,createMeasurement,insertMeasurement} from '../src/charging.ts';
import {bikes,batteries,chargers,configurations} from '../src/domain.ts';
import {readState,saveState} from '../src/persistence.ts';

function fixture(start=1000) {
  const session=createSession({bike:bikes[0],configuration:configurations[0],batteries:batteries.slice(0,2),charger:chargers[0]},'12',start);
  session.measurements=insertMeasurement(session.measurements,createMeasurement('22',start+60000,start+60001),false);
  session.measurements=insertMeasurement(session.measurements,createMeasurement('12',start+120000,start+120001),true);
  session.endedAt=start+180000;
  return session;
}
test('completed sessions sorted by start descending without mutating saved array',()=>{
  const old=fixture(1000),recent=fixture(500000),active={...fixture(900000),endedAt:undefined};
  const sessions=[old,active,recent],before=structuredClone(sessions);
  assert.deepEqual(completedSessions(sessions).map(s=>s.id),[recent.id,old.id]);
  assert.deepEqual(sessions,before);
});
test('legacy summary preserves chronological measurements without inventing end SOC',()=>{
  const session=fixture();session.measurements.reverse();
  const summary=sessionSummary(session);
  assert.deepEqual(summary.points.map(m=>m.soc),[12,22,12]);
  assert.equal(summary.start.soc,12);assert.equal(summary.end,undefined);
  assert.equal(summary.points.at(-1).quality.status,'flagged');
  assert.equal(summary.points.at(-1).measuredAt,121000);
});
test('IndexedDB persists/restores completed snapshots and rolls back failed writes',async()=>{
 const database=new CompanionDB('history-'+crypto.randomUUID());
 try{
  const recent=fixture(10000000),legacy=fixture(1000000);delete legacy.measurements[0].quality;
  recent.snapshot.bike.name='Historisches Fahrradprofil';recent.snapshot.configuration.id='historisch-config';
  const state={...initialState(),activeBikeId:'yamaha',chargerId:'fast',sessions:[recent,legacy]};
  const saved=await saveState(state,database),restored=await readState(database);
  assert.deepEqual(restored,saved);assert.deepEqual(restored.sessions[0].snapshot,recent.snapshot);
  assert.equal(restored.sessions[0].measurements.at(-1).quality.status,'flagged');
  const next={...restored,sessions:[...restored.sessions,{...fixture(500000),endedAt:undefined}]};
  const savedNext=await saveState(next,database);assert.deepEqual((await readState(database)).sessions.slice(0,2),saved.sessions);
  const fail=()=>{throw new Error('Simulierter Schreibfehler');};database.measurements.hook('creating',fail);
  await assert.rejects(saveState({...savedNext,sessions:[fixture(20000000)]},database));
  database.measurements.hook('creating').unsubscribe(fail);
  assert.deepEqual(await readState(database),savedNext);
 }finally{await database.delete();}
});
test('legacy session with one or no measurement remains inspectable',()=>{
  const session=fixture();session.measurements=[];
  assert.equal(sessionSummary(session).end,undefined);
  session.measurements=[createMeasurement('32',session.startedAt,session.startedAt)];
  const summary=sessionSummary(session);assert.equal(summary.start.soc,32);assert.equal(summary.end,undefined);
});
