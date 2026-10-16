import type {AppState} from './domain.ts';
import {assertSocData,duplicateRideDays} from './rideRules.ts';
import {bikes,batteries,chargers,configurations} from './domain.ts';
import {db, type CompanionDB} from './database.ts';
export function initialState():AppState {return {showDataNav:true,activeBikeId:'rm',chargerId:'compact',sessions:[],catalog:structuredClone({bikes,batteries,chargers,configurations}),rideDays:[],tourLinks:[],boschStats:[],revision:0};}
async function write(state:AppState,database:CompanionDB) {
  const catalog=state.catalog??initialState().catalog!;
  for(const table of database.tables)await table.clear();
  await database.bikes.bulkPut(catalog.bikes);await database.batteries.bulkPut(catalog.batteries);
  await database.chargers.bulkPut(catalog.chargers);await database.configurations.bulkPut(catalog.configurations);
  await database.sessions.bulkPut(state.sessions.map(({measurements,...session})=>session));
  await database.measurements.bulkPut(state.sessions.flatMap(s=>s.measurements.map((m,order)=>({...m,sessionId:s.id,order}))));
  await database.rideDays.bulkPut(state.rideDays??[]);await database.tourLinks.bulkPut(state.tourLinks??[]);await database.boschStats.bulkPut(state.boschStats??[]);
  await database.meta.put({id:'settings',activeBikeId:state.activeBikeId,chargerId:state.chargerId,revision:state.revision??0,showDataNav:state.showDataNav??true});
}
export async function readState(database:CompanionDB=db):Promise<AppState> {
  return database.transaction('rw',database.tables,async()=>{
    let settings=await database.meta.get('settings');
    if(!settings){
      const counts=await Promise.all(database.tables.map(t=>t.count()));
      if(counts.some(n=>n>0))throw new Error('Die Datenbank enthält Daten, aber ihre Einstellungen fehlen. Sie wird zum Schutz deiner Daten nicht zurückgesetzt.');
      const seed=initialState();await write(seed,database);settings=await database.meta.get('settings');
    }
    const [bikeRows,batteryRows,chargerRows,configurationRows,sessions,points,rideDays,tourLinks,boschStats]=await Promise.all([database.bikes.toArray(),database.batteries.toArray(),database.chargers.toArray(),database.configurations.toArray(),database.sessions.toArray(),database.measurements.toArray(),database.rideDays.toArray(),database.tourLinks.toArray(),database.boschStats.toArray()]);
    return {activeBikeId:settings!.activeBikeId,chargerId:settings!.chargerId,revision:settings!.revision,showDataNav:settings!.showDataNav??true,catalog:{bikes:bikeRows,batteries:batteryRows,chargers:chargerRows,configurations:configurationRows},sessions:sessions.sort((a,b)=>b.startedAt-a.startedAt).map(s=>({...s,measurements:points.filter(m=>m.sessionId===s.id).sort((a,b)=>a.order-b.order).map(({sessionId,order,...m})=>m)})),rideDays,tourLinks,boschStats};
  });
}
export async function saveState(state:AppState,database:CompanionDB=db,options:{restore?:boolean}={}):Promise<AppState> {
  assertSocData(state);
  return database.transaction('rw',database.tables,async()=>{
    const previous=await database.meta.get('settings');
    if(previous&&previous.revision!==(state.revision??0))throw new Error('Die Daten wurden in einem anderen Tab geändert. Bitte neu laden, bevor du weitermachst.');
    const oldDays=await database.rideDays.toArray();
    for(const day of options.restore?[]:duplicateRideDays(state.rideDays??[])){const old=oldDays.find(d=>d.id===day.id);if(!old||old.bikeId!==day.bikeId||old.date!==day.date)throw new Error('Für dieses Fahrrad und Datum existiert bereits ein Fahrtag.');}
    const next={...state,revision:(previous?.revision??0)+1};
    await write(next,database);return next;
  });
}
