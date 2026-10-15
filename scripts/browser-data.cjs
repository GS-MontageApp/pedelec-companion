async function settled(page){await page.waitForFunction(()=>document.querySelector('.app')?.getAttribute('aria-busy')==='false');}
async function readApp(page){await settled(page);return page.evaluate(async()=>{
 const database=await new Promise((resolve,reject)=>{const request=indexedDB.open('pedelec-companion-v2');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{
  const names=['bikes','batteries','chargers','configurations','sessions','measurements','rideDays','tourLinks','boschStats','meta'];
  const tx=database.transaction(names,'readonly');const rows={};
  await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const request=tx.objectStore(name).getAll();request.onsuccess=()=>{rows[name]=request.result;resolve();};request.onerror=()=>reject(request.error);})));const settings=rows.meta[0];
  return {activeBikeId:settings.activeBikeId,chargerId:settings.chargerId,revision:settings.revision,catalog:{bikes:rows.bikes,batteries:rows.batteries,chargers:rows.chargers,configurations:rows.configurations},sessions:rows.sessions.sort((a,b)=>b.startedAt-a.startedAt).map(s=>({...s,measurements:rows.measurements.filter(m=>m.sessionId===s.id).sort((a,b)=>a.order-b.order).map(({sessionId,order,...m})=>m)})),rideDays:rows.rideDays,tourLinks:rows.tourLinks,boschStats:rows.boschStats};
 }finally{database.close();}
});}
async function writeApp(page,data){await settled(page);return page.evaluate(async state=>{
 const database=await new Promise((resolve,reject)=>{const request=indexedDB.open('pedelec-companion-v2');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{await new Promise((resolve,reject)=>{
  const names=['bikes','batteries','chargers','configurations','sessions','measurements','rideDays','tourLinks','boschStats','meta'],tx=database.transaction(names,'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
  for(const name of names)tx.objectStore(name).clear();
  for(const name of ['bikes','batteries','chargers','configurations'])for(const row of state.catalog[name])tx.objectStore(name).put(row);
  for(const {measurements,...s} of state.sessions){tx.objectStore('sessions').put(s);measurements.forEach((m,order)=>tx.objectStore('measurements').put({...m,order,sessionId:s.id}));}
  for(const name of ['rideDays','tourLinks','boschStats'])for(const row of state[name]??[])tx.objectStore(name).put(row);
  tx.objectStore('meta').put({id:'settings',activeBikeId:state.activeBikeId,chargerId:state.chargerId,revision:state.revision??0});
 });}finally{database.close();}
},data);}
function browserOptions(){const name=process.env.TEST_BROWSER_CHANNEL||'msedge';return name==='chromium'?{headless:true}:{headless:true,channel:name};}
module.exports={readApp,writeApp,settled,browserOptions};
