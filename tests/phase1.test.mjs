import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,saveState,readState} from '../src/persistence.ts';
import {CompanionDB} from '../src/database.ts';
import {saveRideDay,duplicateRideDays,dayBalance,regularRideDays} from '../src/rideRules.ts';
import {chargeSuggestions} from '../src/travel.ts';
import {createSession,createMeasurement,finishSession} from '../src/charging.ts';
import {parseBackup,exportBackup} from '../src/backup.ts';
const fixture=()=>{
 const state=initialState(),c=state.catalog,startedAt=new Date('2026-10-15T12:00:00').getTime(),endedAt=startedAt+3600000;
 let s=createSession({bike:c.bikes[0],configuration:c.configurations[0],batteries:c.batteries.slice(0,2),charger:c.chargers[0]},'20',startedAt);
 s=finishSession(s,endedAt,{kind:'reading',point:createMeasurement('30',endedAt,endedAt),confirmed:false});state.sessions=[s];
 const day={id:'d1',date:'2026-10-15',bikeId:'rm',configuration:s.snapshot.configuration,batteries:s.snapshot.batteries,startSoc:100,endSoc:55,notes:'Tag',sessionIds:[s.id]};state.rideDays=[day];return {state,day,s};
};
test('ride SOC boundaries, zero, test and invalid external/imported values',async()=>{
 const {state,day}=fixture();
 for(const n of [0,100])assert.equal(saveRideDay(state,{...day,startSoc:n,endSoc:n,isTest:true}).rideDays[0].endSoc,n);
 for(const n of [-1,101,1.5,NaN,'20',null]){
  const bad={...state,rideDays:[{...day,endSoc:n,isTest:true}]};assert.throws(()=>saveRideDay(state,bad.rideDays[0]));
  assert.throws(()=>parseBackup(JSON.stringify({app:'pedelec-companion',version:1,exportedAt:new Date().toISOString(),data:bad})));
  await assert.rejects(saveState(bad));
 }
});
test('one local calendar day per bike; legacy duplicates are preserved and excluded',async()=>{
 const {state,day}=fixture();assert.throws(()=>saveRideDay(state,{...day,id:'other'}),/existiert/);
 const other={...day,id:'other',bikeId:'yamaha',configuration:state.catalog.configurations[1],batteries:[state.catalog.batteries[2]],sessionIds:[]};assert.equal(saveRideDay(state,other).rideDays.length,2);
 const legacy={...state,rideDays:[day,{...day,id:'old-duplicate',sessionIds:[]}]};assert.equal(duplicateRideDays(legacy.rideDays).length,2);assert.equal(regularRideDays(legacy).length,0);
 assert.equal(parseBackup(exportBackup(legacy)).rideDays.length,2);
 assert.equal(saveRideDay(legacy,{...day,notes:'Bearbeitet'}).rideDays.length,2);
 const db=new CompanionDB('duplicate-'+crypto.randomUUID());try{await readState(db);await assert.rejects(saveState(legacy,db),/existiert/);await saveState(legacy,db,{restore:true});assert.equal((await readState(db)).rideDays.length,2);}finally{await db.delete();}
});
test('editing preserves test flag, charge IDs and linked GPX; persistence and backup roundtrip',async()=>{
 const {state,day}=fixture();day.isTest=true;state.showDataNav=false;state.tourLinks=[{id:'tour',rideDayId:day.id,url:'https://www.komoot.com/tour/123',komootId:'123'}];
 const next=saveRideDay(state,{...day,endSoc:0,notes:'Abendfahrt'});assert.deepEqual(next.tourLinks,state.tourLinks);assert.deepEqual(next.rideDays[0].sessionIds,day.sessionIds);assert.equal(regularRideDays(next).length,0);
 assert.deepEqual(parseBackup(exportBackup(next)),next);
 let db=new CompanionDB('phase1-'+crypto.randomUUID());const dbName=db.name;try{await readState(db);const saved=await saveState(next,db);db.close();db=new CompanionDB(dbName);assert.deepEqual(await readState(db),saved);}finally{await db.delete();}
 const old=JSON.parse(exportBackup(state));delete old.data.showDataNav;delete old.data.rideDays[0].isTest;delete old.data.rideDays[0].socBasis;assert.equal(parseBackup(JSON.stringify(old)).rideDays[0].isTest,undefined);
});
test('charge proposals require confirmation, respect time boundaries and deduplicate balance',()=>{
 const {state,day,s}=fixture();day.sessionIds=[];day.startedAt=s.startedAt-3600000;day.endedAt=s.endedAt+3600000;
 assert.equal(chargeSuggestions(day,state)[0].withinRide,true);assert.equal(dayBalance(day,state).consumed,45);
 day.sessionIds=[s.id];assert.equal(dayBalance(day,state).charged,10);assert.equal(dayBalance(day,state).consumed,55);
 day.sessionIds.push(s.id);assert.equal(dayBalance(day,state).charged,10);assert.throws(()=>saveRideDay(state,day),/einmal/);day.sessionIds=[s.id];
 day.endedAt=s.startedAt-1000;assert.equal(chargeSuggestions(day,state)[0].withinRide,false);assert.equal(dayBalance(day,state).complete,false);
 day.endedAt=s.endedAt+1000;s.isTest=true;assert.equal(dayBalance(day,state).complete,false);s.isTest=false;s.endSoc=null;assert.equal(dayBalance(day,state).complete,false);
});
test('incompatible configuration, unknown basis and duplicate associations never yield a real balance',()=>{
 const {state,day,s}=fixture();day.socBasis='unknown';assert.equal(dayBalance(day,state).complete,false);delete day.socBasis;
 s.snapshot.configuration={...s.snapshot.configuration,batteryIds:['replacement']};assert.equal(dayBalance(day,state).complete,false);
 const f=fixture();f.state.rideDays.push({...f.day,id:'d2',date:'2026-10-16'});assert.equal(dayBalance(f.day,f.state).complete,false);
 assert.throws(()=>saveRideDay({...f.state,rideDays:[f.state.rideDays[1]]},f.day),/bereits/);
});
