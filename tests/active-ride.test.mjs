import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,readState,saveState} from '../src/persistence.ts';
import {CompanionDB} from '../src/database.ts';
import {activeRide,startRide,captureRideSoc,endRide,correctRideSoc,deleteRideSoc,openingTab,syncRideEndpoints,ridePoints} from '../src/rideLifecycle.ts';
import {saveRideDay,dayBalance,regularRideDays} from '../src/rideRules.ts';
import {createSession,createMeasurement,finishSession} from '../src/charging.ts';
import {exportBackup,parseBackup} from '../src/backup.ts';
const at=new Date('2026-10-16T08:00:00').getTime();
const start=()=>startRide(initialState(),'rm','100',at);
test('active day starts with stable snapshot and no invented end, finishes with explicit endpoint',()=>{
 let s=start(),d=activeRide(s);assert.equal(d.endSoc,undefined);assert.equal(d.socMeasurements[0].kind,'start');assert.equal(d.startedAt,at);
 for(const n of ['101','-1','1.5','abc',''])assert.throws(()=>startRide(initialState(),'rm',n,at));
 s=captureRideSoc(s,d.id,'80','Anstieg',at+1000);s=captureRideSoc(s,d.id,'95','nach Ladepause',at+2000);
 assert.equal(activeRide(s).socMeasurements.length,3);assert.equal(new Set(activeRide(s).socMeasurements.map(p=>p.id)).size,3);
 assert.throws(()=>startRide(s,'yamaha','60',at));s=endRide(s,d.id,'50',at+3000);d=s.rideDays[0];assert.equal(activeRide(s),undefined);assert.equal(d.endSoc,50);assert.equal(d.socMeasurements.at(-1).kind,'end');assert.equal(d.endedAt,at+3000);
 assert.throws(()=>startRide(s,'rm','50',at+4000),/existiert/);assert.equal(regularRideDays({...s,rideDays:[{...d,isTest:true}]}).length,0);
});
test('correction and deletion affect exactly one checkpoint; no SOC rise/decrease plausibility blocking',()=>{
 let s=start(),id=activeRide(s).id;s=captureRideSoc(s,id,'12','',at+2000);s=captureRideSoc(s,id,'100','',at+3000);const p=activeRide(s).socMeasurements[1];
 s=correctRideSoc(s,id,p.id,'22',at+1500,'korrigiert',at+4000);assert.equal(activeRide(s).socMeasurements[1].id,p.id);assert.equal(activeRide(s).socMeasurements[1].recordedAt,p.recordedAt);assert.equal(ridePoints(activeRide(s))[1].soc,22);
 assert.throws(()=>correctRideSoc(s,id,p.id,'10',at-1));assert.throws(()=>deleteRideSoc(s,id,activeRide(s).socMeasurements[0].id));
 s=deleteRideSoc(s,id,p.id);assert.equal(activeRide(s).id,id);assert.equal(activeRide(s).socMeasurements.length,2);assert.equal(activeRide(s).socMeasurements[1].soc,100);
});
test('charging coexists with active day and balance counts charged SOC only once, never checkpoints',()=>{
 let s=start(),d=activeRide(s),c=s.catalog;
 let charge=createSession({bike:c.bikes[0],configuration:c.configurations[0],batteries:c.batteries.slice(0,2),charger:c.chargers[0]},'40',at+1000);s={...s,sessions:[charge]};assert.equal(openingTab(s,'Daten'),'Laden');assert.equal(activeRide(s).id,d.id);
 charge=finishSession(charge,at+3000,{kind:'reading',point:createMeasurement('60',at+3000,at+3000),confirmed:false});s={...s,sessions:[charge]};s=captureRideSoc(s,d.id,'60','',at+4000);assert.equal(dayBalance(activeRide(s),s).complete,false);
 s=endRide(s,d.id,'50',at+5000);d=s.rideDays[0];s=saveRideDay(s,{...d,sessionIds:[charge.id]});assert.equal(dayBalance(s.rideDays[0],s).consumed,70);assert.equal(dayBalance(s.rideDays[0],s).charged,20);
});
test('opening tab priority and explicit shortcut; hidden optional Data tab never restored',()=>{
 const empty=initialState();assert.equal(openingTab(empty,'Einstellungen'),'Einstellungen');assert.equal(openingTab({...empty,showDataNav:false},'Daten'),'Laden');assert.equal(openingTab(start(),'Daten'),'Reisen');assert.equal(openingTab(start(),'Laden',true),'Reisen');assert.equal(openingTab(empty,null),'Laden');
});
test('legacy duplicates, links, active measurements and test flags survive IndexedDB reopening and backup',async()=>{
 const db=new CompanionDB('a08-'+crypto.randomUUID());try{
 let s=await readState(db);s=startRide(s,'rm','80',at,true);const id=activeRide(s).id;s=captureRideSoc(s,id,'55','Wind',at+1000);
 const old={...s.rideDays[0],id:'legacy-a',date:'2026-10-15',startSoc:100,endSoc:50,notes:'Alt',sessionIds:[]};delete old.status;delete old.socMeasurements;delete old.startedAt;
 s.rideDays.push(old,{...old,id:'legacy-b'});s=await saveState(s,db,{restore:true});db.close();await db.open();const read=await readState(db);assert.deepEqual(read,s);assert.deepEqual(parseBackup(exportBackup(s)),s);assert.equal(activeRide(read).isTest,true);
 const edited=saveRideDay(read,{...read.rideDays.find(d=>d.id==='legacy-b'),notes:'einzeln'});const saved=await saveState(edited,db);assert.equal(saved.rideDays.length,3);assert.equal(saved.rideDays.find(d=>d.id==='legacy-a').notes,'Alt');assert.equal(activeRide(saved).socMeasurements.length,2);
 }finally{await db.delete();}
});
test('completed endpoint editing stays consistent, including overnight day and backdated checkpoint',()=>{
 let s=start(),id=activeRide(s).id;s=captureRideSoc(s,id,'60','',at+1000);s=endRide(s,id,'50',at+24*3600000);let d=s.rideDays[0];
 d=syncRideEndpoints({...d,startSoc:90,endSoc:40});s=saveRideDay(s,d);assert.equal(d.socMeasurements[0].soc,90);assert.equal(d.socMeasurements.at(-1).soc,40);assert.deepEqual(parseBackup(exportBackup(s)),s);
 const bad=JSON.parse(exportBackup(s));bad.data.rideDays[0].socMeasurements[0].soc=1;assert.throws(()=>parseBackup(JSON.stringify(bad)));
});
