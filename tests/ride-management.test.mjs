import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,readState,saveState} from '../src/persistence.ts';
import {CompanionDB} from '../src/database.ts';
import {activeRide,startRide,captureRideSoc,endRide,resumeRideDay,deleteRideDay,syncRideEndpoints,todaysRideDays} from '../src/rideLifecycle.ts';
import {dayBalance} from '../src/rideRules.ts';
import {createSession,createMeasurement,finishSession} from '../src/charging.ts';
import {exportBackup,parseBackup} from '../src/backup.ts';
const normalize=s=>({...s,rideDays:[...s.rideDays].sort((a,b)=>a.id.localeCompare(b.id))});
const at=new Date('2026-10-16T08:00:00').getTime();
function fixture(){let s=startRide(initialState(),'rm','100',at,true),id=activeRide(s).id;s=captureRideSoc(s,id,'70','Wind',at+1000);s=endRide(s,id,'50',at+2000);const day=s.rideDays[0];return {s,id,day};}
test('resuming preserves every existing measurement, snapshot, test flag and prior endpoint by ID',()=>{
 const {s,id,day}=fixture(),before=structuredClone(s);let next=resumeRideDay(s,id,at+3000),d=activeRide(next);
 assert.deepEqual(s,before);assert.equal(d.id,id);assert.equal(d.startSoc,100);assert.equal(d.startedAt,at);assert.equal(d.endSoc,undefined);assert.equal(d.endedAt,undefined);assert.equal(d.isTest,true);assert.deepEqual(d.configuration,day.configuration);assert.deepEqual(d.socMeasurements,day.socMeasurements);
 assert.equal(d.resumptions[0].previousEndSoc,50);assert.equal(d.resumptions[0].previousEndedAt,at+2000);assert.equal(d.resumptions[0].previousEndPointIds[0],day.socMeasurements.at(-1).id);
 next=captureRideSoc(next,id,'45','',at+4000);next=endRide(next,id,'40',at+5000);d=next.rideDays[0];assert.equal(d.endSoc,40);assert.equal(d.socMeasurements.length,5);assert.equal(d.socMeasurements.find(p=>p.id===day.socMeasurements.at(-1).id).soc,50);assert.deepEqual(parseBackup(exportBackup(next)),next);
 next=resumeRideDay(next,id,at+6000);assert.equal(activeRide(next).resumptions.length,2);assert.equal(activeRide(next).resumptions[1].previousEndSoc,40);assert.deepEqual(parseBackup(exportBackup(next)),next);
 const invalid=JSON.parse(exportBackup(next));invalid.data.rideDays[0].resumptions[0].previousEndSoc=1;assert.throws(()=>parseBackup(JSON.stringify(invalid)),/Abschluss/);
 const corrected=syncRideEndpoints({...next.rideDays[0],startSoc:90});assert.equal(corrected.socMeasurements.find(p=>p.id===day.socMeasurements.at(-1).id).soc,50);
});
test('legacy missing times remain unknown; later explicit start correction is traceable',()=>{
 const {s,day,id}=fixture();const old={...day};delete old.status;delete old.startedAt;delete old.endedAt;delete old.socMeasurements;s.rideDays=[old];
 let next=resumeRideDay(s,id,at+3000);assert.equal(activeRide(next).startedAt,undefined);assert.equal(activeRide(next).socMeasurements.length,0);assert.equal(activeRide(next).resumptions[0].previousEndSoc,50);assert.equal(activeRide(next).resumptions[0].previousEndedAt,undefined);
 next=captureRideSoc(next,id,'49','',at+4000);assert.deepEqual(parseBackup(exportBackup(next)),next);next=endRide(next,id,'48',at+5000);assert.equal(next.rideDays[0].startedAt,undefined);
 const edited=syncRideEndpoints({...next.rideDays[0],startedAt:at,startSoc:95});assert.equal(edited.socMeasurements.find(p=>p.kind==='start').measuredAt,at);assert.equal(edited.resumptions[0].previousStartSoc,100);
});
test('legacy known start/end values become historical points at their actual saved times',()=>{
 const {s,day,id}=fixture();const old={...day};delete old.status;delete old.socMeasurements;s.rideDays=[old];const next=resumeRideDay(s,id,at+3000),d=activeRide(next);assert.deepEqual(d.socMeasurements.map(p=>[p.kind,p.soc,p.measuredAt]),[['start',100,at],['end',50,at+2000]]);assert.deepEqual(parseBackup(exportBackup(next)),next);
});
test('duplicate selection, one active day and today rule never merge or overwrite rows',()=>{
 const {s,day,id}=fixture();s.rideDays.push({...day,id:'duplicate'});assert.equal(todaysRideDays(s,'rm',at).length,2);const next=resumeRideDay(s,'duplicate',at+3000);assert.equal(activeRide(next).id,'duplicate');assert.deepEqual(next.rideDays.find(d=>d.id===id),day);assert.throws(()=>resumeRideDay(next,id,at+4000),/bereits/);assert.throws(()=>resumeRideDay(s,id,at+86400000),/heutigen/);assert.throws(()=>resumeRideDay(s,'missing',at));
});
test('delete only selected day and dependent day records; standalone charging remains byte-for-byte identical',()=>{
 const {s,day,id}=fixture(),c=s.catalog;let charge=createSession({bike:c.bikes[0],configuration:c.configurations[0],batteries:c.batteries.slice(0,2),charger:c.chargers[0]},'40',at+500);charge=finishSession(charge,at+1500,{kind:'reading',point:createMeasurement('60',at+1500,at+1500),confirmed:false});s.sessions=[charge];day.sessionIds=[charge.id];s.rideDays.push({...day,id:'other',sessionIds:[]});s.tourLinks=[{id:'a',rideDayId:id},{id:'b',rideDayId:'other'}];s.boschStats=[{id:'a',rideDayId:id,modes:{},source:'manuell'},{id:'b',rideDayId:'other',modes:{},source:'manuell'}];
 const before=structuredClone(s);const next=deleteRideDay(s,id);assert.deepEqual(s,before);assert.deepEqual(next.sessions,s.sessions);assert.equal(next.rideDays.length,1);assert.equal(next.rideDays[0].id,'other');assert.deepEqual(next.tourLinks,[s.tourLinks[1]]);assert.deepEqual(next.boschStats,[s.boschStats[1]]);assert.deepEqual(parseBackup(exportBackup(next)),next);
 const resumed=resumeRideDay(s,id,at+3000);assert.equal(activeRide(deleteRideDay(resumed,id)),undefined);assert.equal(dayBalance({...day,isTest:false},s).consumed,70);
});
test('IndexedDB persists resumed state/deletion, backups retain audit, stale writes cannot delete',async()=>{
 const db=new CompanionDB('a10-'+crypto.randomUUID());try{await readState(db);const {s,id,day}=fixture();const legacy={...day,id:'duplicate'};delete legacy.socMeasurements;delete legacy.status;s.rideDays.push(legacy);let saved=await saveState(s,db,{restore:true});const originalBackup=exportBackup(saved);
 saved=await saveState(resumeRideDay(saved,id,at+3000),db);db.close();await db.open();assert.deepEqual(normalize(await readState(db)),normalize(saved));assert.deepEqual(parseBackup(exportBackup(saved)),saved);
 const stale={...deleteRideDay(saved,id),revision:saved.revision-1};await assert.rejects(saveState(stale,db),/anderen Tab/);assert.deepEqual(normalize(await readState(db)),normalize(saved));
 const removed=await saveState(deleteRideDay(saved,id),db);db.close();await db.open();assert.deepEqual(await readState(db),removed);assert.equal(activeRide(removed),undefined);assert.equal(parseBackup(originalBackup).rideDays.length,2);
 }finally{await db.delete();}
});
