import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CompanionDB} from '../src/database.ts';
import {initialState,readState,saveState} from '../src/persistence.ts';
import {exportBackup,parseBackup} from '../src/backup.ts';
import {analyzeGpx,komootLink,dayBalance,testSuggestion,learningMeasurements} from '../src/travel.ts';
import {createSession,createMeasurement,finishSession} from '../src/charging.ts';
const fixture=()=>{const state=initialState(),c=state.catalog;let s=createSession({bike:c.bikes[0],configuration:c.configurations[0],batteries:c.batteries.slice(0,2),charger:c.chargers[0]},'20',Date.parse('2026-10-15T10:00:00Z'));s=finishSession(s,s.startedAt+3600000,{kind:'reading',point:createMeasurement('60',s.startedAt+3600000,s.startedAt+3600000),confirmed:false});state.sessions=[s];return state;};
test('IndexedDB survives closing/reopening; stale tabs cannot overwrite newer data',async()=>{
 const name='reopen-'+crypto.randomUUID();let db=new CompanionDB(name);
 const seed=await readState(db);assert.equal(seed.sessions.length,0);
 const saved=await saveState({...seed,...fixture(),revision:seed.revision},db);db.close();db=new CompanionDB(name);
 try{assert.deepEqual(await readState(db),saved);await assert.rejects(saveState(seed,db),/anderen Tab/);assert.deepEqual(await readState(db),saved);}finally{await db.delete();}
});
test('full JSON roundtrip; schema/version/relations reject before writing',()=>{
 const state=fixture();state.sessions[0].isTest=true;
 assert.deepEqual(parseBackup(exportBackup(state)),state);
 const raw=JSON.parse(exportBackup(state));raw.version=99;assert.throws(()=>parseBackup(JSON.stringify(raw)),/Version/);
 raw.version=1;raw.data.sessions[0].endSoc=99;assert.throws(()=>parseBackup(JSON.stringify(raw)),/Endwert/);
 assert.throws(()=>parseBackup('{bad'));
 const duplicate=JSON.parse(exportBackup(state));duplicate.data.sessions.push(duplicate.data.sessions[0]);assert.throws(()=>parseBackup(JSON.stringify(duplicate)),/Doppelte/);
 const secret=JSON.parse(exportBackup(state));secret.data.apiKey='never';assert.throws(()=>parseBackup(JSON.stringify(secret)));
});
test('test flag is reversible, never auto-deletes, excludes learning; short duration suggests only',()=>{
 const state=fixture(),s=state.sessions[0];assert.equal(learningMeasurements(s).length,2);
 s.isTest=true;assert.deepEqual(learningMeasurements(s),[]);assert.equal(s.measurements.length,2);
 s.isTest=false;assert.equal(learningMeasurements(s).length,2);
 assert.match(testSuggestion({...s,endedAt:s.startedAt+1000}),/möglicherweise/);
});
test('ride day balance includes compatible charging, works without a tour, excludes tests/unknown SOC',()=>{
 const state=fixture(),s=state.sessions[0],day={id:'day',date:'2026-10-15',bikeId:'rm',configuration:s.snapshot.configuration,batteries:s.snapshot.batteries,startSoc:80,endSoc:30,notes:'Camping',sessionIds:[s.id]};
 state.rideDays=[day];assert.deepEqual(dayBalance(day,state),{charged:40,consumed:90,complete:true,excluded:[]});
 assert.equal(parseBackup(exportBackup(state)).tourLinks.length,0);
 s.isTest=true;assert.equal(dayBalance(day,state).complete,false);s.isTest=false;s.endSoc=null;
 assert.equal(dayBalance(day,state).complete,false);
});
test('Komoot variants extract tour 3151148876; short links stay unresolved; unsafe URLs rejected',()=>{
 for(const url of ['https://www.komoot.com/tour/3151148876','https://www.komoot.de/de-de/tour/3151148876?share_token=abc','https://www.komoot.com/t/3151148876','https://www.komoot.com/tours/3151148876/'])assert.equal(komootLink(url).id,'3151148876');
 assert.equal(komootLink('https://komoot.app/abc').id,undefined);
 assert.match(komootLink('https://www.komoot.com/tour/3151148876?share_token=abc').url,/share_token=abc/);
 for(const url of ['javascript:alert(1)','https://komoot.com.evil.test/tour/3151148876','https://user:secret@komoot.com/tour/3151148876'])assert.throws(()=>komootLink(url));
});
test('learner excludes decreasing values even if an imported quality flag claims valid',()=>{
 const s=fixture().sessions[0];s.measurements.push(createMeasurement('10',s.startedAt+4000000,s.startedAt+4000000));
 assert.equal(learningMeasurements(s).some(m=>m.soc===10),false);
});
test('equal minute timestamps retain capture order in learning filter',()=>{
 const s=fixture().sessions[0];s.measurements[1].measuredAt=s.measurements[0].measuredAt;
 assert.equal(learningMeasurements(s).length,2);
});
test('missing metadata never silently resets a nonempty database',async()=>{
 const db=new CompanionDB('protect-'+crypto.randomUUID());try{await readState(db);await db.meta.clear();await assert.rejects(readState(db),/nicht zurückgesetzt/);assert.equal(await db.bikes.count(),2);}finally{await db.delete();}
});
const gpx=`<?xml version="1.0"?><gpx><trk><trkseg>
<trkpt lat="48" lon="8"><ele>100</ele><time>2026-10-15T10:00:00Z</time></trkpt>
<trkpt lat="48.001" lon="8"><ele>110</ele><time>2026-10-15T10:01:00Z</time></trkpt>
<trkpt lat="48.001" lon="8"><ele>110</ele><time>2026-10-15T10:04:00Z</time></trkpt>
<trkpt lat="70" lon="30"><ele>10000</ele><time>2026-10-15T10:04:01Z</time></trkpt>
<trkpt lat="48.002" lon="8"><ele>105</ele><time>2026-10-15T10:05:00Z</time></trkpt>
</trkseg></trk></gpx>`;
test('GPX distance, elevation, timestamps and pauses ignore isolated GPS spike',()=>{
 const r=analyzeGpx(gpx);assert.ok(r.distanceKm>0.21&&r.distanceKm<0.24);assert.equal(r.ascentM,10);assert.equal(r.descentM,5);
 assert.equal(r.elapsedMs,300000);assert.equal(r.pauseCount,1);assert.equal(r.pauseMs,180000);assert.equal(r.discardedPoints,1);assert.equal(r.pointCount,4);
});
test('GPX handles namespaces, missing values and segment boundaries; malformed/DTD rejected',()=>{
 const r=analyzeGpx('<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="48" lon="8"/><trkpt lat="48.001" lon="8"/></trkseg><trkseg><trkpt lat="49" lon="8"/><trkpt lat="49.001" lon="8"/></trkseg></trk></gpx>');
 assert.ok(r.distanceKm<0.3);assert.equal(r.elapsedMs,undefined);assert.equal(r.ascentM,undefined);assert.match(r.warnings.join(' '),/Zeitstempel fehlen/);
 assert.throws(()=>analyzeGpx('<!DOCTYPE gpx [<!ENTITY x SYSTEM "file:///secret">]><gpx/>'));
 assert.throws(()=>analyzeGpx('<gpx><bad>'));assert.throws(()=>analyzeGpx('<gpx/>'));
});
