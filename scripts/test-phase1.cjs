const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {readApp,writeApp,settled,browserOptions}=require('./browser-data.cjs');
const url=process.env.TEST_PWA_URL||'http://localhost:4173/pedelec-companion/';
const btn=(p,name)=>p.getByRole('button',{name,exact:true});
async function soc(p,field,value){await btn(p,field+'-SOC (%)').tap();await btn(p,'Eingabe löschen').tap();for(const d of String(value))await btn(p,d).tap();await btn(p,'Eingabe übernehmen').tap();}
(async()=>{const browser=await chromium.launch(browserOptions());try{
 for(const width of [320,390,412]){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,locale:'de-DE',timezoneId:'Europe/Berlin'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await btn(page,'Ladevorgang starten').waitFor();await btn(page,'Daten').tap();await btn(page,'Fahrtag hinzufügen').tap();
 await btn(page,'Start-SOC (%)').tap();assert.equal(await page.locator('.soc-active').count(),1);assert.equal(await page.locator('input[name=startSoc],input[name=endSoc]').count(),0);
 for(const d of ['1','0','1'])await btn(page,d).tap();assert.equal(await page.locator('output').innerText(),'10%');await btn(page,'Letzte Ziffer löschen').tap();assert.equal(await page.locator('output').innerText(),'1%');await btn(page,'Eingabe löschen').tap();for(const d of ['1','0','0'])await btn(page,d).tap();assert.equal(await page.locator('output').innerText(),'100%');await btn(page,'Eingabe übernehmen').tap();
 await soc(page,'End',0);await page.getByLabel('Als Test-Fahrtag kennzeichnen').check();await btn(page,'Fahrtag speichern').tap();await settled(page);
 let state=await readApp(page);assert.equal(state.rideDays.length,1);assert.equal(state.rideDays[0].endSoc,0);assert.equal(state.rideDays[0].isTest,true);assert.match(await page.locator('.diary').innerText(),/TEST/);
 await btn(page,'Fahrtag hinzufügen').tap();await btn(page,'Vorhandenen Fahrtag bearbeiten (100 % / 0 %)').tap();await page.getByLabel('Notizen',{exact:true}).fill('Abendfahrt');await btn(page,'Fahrtag speichern').tap();await settled(page);assert.equal((await readApp(page)).rideDays.length,1);assert.equal((await readApp(page)).rideDays[0].isTest,true);
 await btn(page,'Einstellungen').tap();await page.getByLabel('Daten in der unteren Navigation anzeigen').tap();await settled(page);assert.equal(await page.getByRole('navigation',{name:'Hauptnavigation'}).getByRole('button',{name:'Daten',exact:true}).count(),0);
 await page.reload();await btn(page,'Einstellungen').tap();assert.equal(await page.getByLabel('Daten in der unteren Navigation anzeigen').isChecked(),false);await btn(page,'Daten öffnen · Fahrtenbuch und GPX').tap();await btn(page,'Fahrtag hinzufügen').waitFor();
 await btn(page,'Einstellungen').tap();await page.getByLabel('Daten in der unteren Navigation anzeigen').tap();await settled(page);await btn(page,'Daten').tap();assert.equal((await readApp(page)).showDataNav,true);assert.equal((await readApp(page)).rideDays[0].notes,'Abendfahrt');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 // F01: long lists and legacy duplicates must edit in place by ID, preserving charge links.
 await btn(page,'Laden').tap();await btn(page,'Ladevorgang starten').tap();
 for(const digit of '20')await btn(page,digit).tap();await btn(page,'Laden starten').tap();await settled(page);
 await btn(page,'Beenden').tap();for(const digit of '60')await btn(page,digit).tap();await btn(page,'Ladung abschließen').tap();await settled(page);
 state=await readApp(page);const charge=state.sessions[0],stamp=new Date('2026-10-15T12:00:00').getTime(),offset=stamp-charge.startedAt;
 charge.startedAt+=offset;charge.endedAt+=offset;charge.measurements=charge.measurements.map(m=>({...m,measuredAt:m.measuredAt+offset,recordedAt:m.recordedAt+offset}));
 const base={...state.rideDays[0],configuration:charge.snapshot.configuration,batteries:charge.snapshot.batteries,isTest:false,startSoc:80,endSoc:30,sessionIds:[]};
 state.rideDays=Array.from({length:40},(_,i)=>({...base,id:'long-'+i,date:new Date(Date.UTC(2026,10,20-i)).toISOString().slice(0,10),notes:'Listeneintrag '+i}));
 state.rideDays.push({...base,id:'duplicate-a',date:'2026-10-15',notes:'Doppelter Tag A',sessionIds:[charge.id]},{...base,id:'duplicate-b',date:'2026-10-15',notes:'Doppelter Tag B'});
 await writeApp(page,state);await page.reload();await btn(page,'Daten').tap();await settled(page);
 const row=id=>page.locator('details[data-ride-id="'+id+'"]'),edit=id=>btn(row(id),'Fahrtag bearbeiten / Tour ergänzen');
 await row('duplicate-a').locator(':scope > summary').tap();await edit('duplicate-a').tap();
 assert.equal(await page.locator('.diary > .ride-editor').count(),0);assert.equal(await row('duplicate-a').locator('.ride-editor').count(),1);
 assert.equal(await row('duplicate-a').getByLabel('Notizen',{exact:true}).inputValue(),'Doppelter Tag A');
 const heading=await row('duplicate-a').getByRole('heading',{name:'Fahrtag bearbeiten',exact:true}).boundingBox();assert.ok(heading.y>=0&&heading.y<844,'Editor unmittelbar sichtbar');
 assert.ok(await page.evaluate(()=>scrollY>500),'Auswahl liegt weit unten in langer Liste');
 await row('duplicate-b').locator(':scope > summary').tap();await edit('duplicate-b').tap();
 assert.equal(await page.locator('.ride-editor').count(),1);assert.equal(await row('duplicate-a').locator('.ride-editor').count(),0);
 await row('duplicate-b').getByLabel('Notizen',{exact:true}).fill('B einzeln bearbeitet');await btn(row('duplicate-b'),'Fahrtag speichern').tap();await settled(page);
 assert.equal(await page.locator('.ride-editor').count(),0);let saved=await readApp(page);
 assert.equal(saved.rideDays.length,42);assert.equal(saved.rideDays.find(d=>d.id==='duplicate-a').notes,'Doppelter Tag A');assert.equal(saved.rideDays.find(d=>d.id==='duplicate-b').notes,'B einzeln bearbeitet');
 let position=await edit('duplicate-b').boundingBox();assert.ok(position.y>=0&&position.y<844);assert.ok(await page.evaluate(()=>scrollY>500),'Speichern springt nicht nach oben');
 await edit('duplicate-a').tap();await row('duplicate-a').getByLabel('Notizen',{exact:true}).fill('A einzeln bearbeitet');await btn(row('duplicate-a'),'Fahrtag speichern').tap();await settled(page);
 saved=await readApp(page);assert.deepEqual(saved.rideDays.find(d=>d.id==='duplicate-a').sessionIds,[charge.id]);assert.deepEqual(saved.sessions,state.sessions);
 await edit('duplicate-a').tap();await row('duplicate-a').getByLabel('Notizen',{exact:true}).fill('Nicht speichern');await btn(row('duplicate-a'),'Abbrechen').tap();await settled(page);
 assert.deepEqual(await readApp(page),saved);assert.equal(await page.locator('.ride-editor').count(),0);position=await edit('duplicate-a').boundingBox();assert.ok(position.y>=0&&position.y<844);assert.ok(await page.evaluate(()=>scrollY>500),'Abbrechen springt nicht nach oben');
 await page.reload();await btn(page,'Daten').tap();await settled(page);assert.deepEqual(await readApp(page),saved);
 await row('duplicate-a').locator(':scope > summary').tap();await edit('duplicate-a').tap();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 await page.screenshot({path:'.test-artifacts/inline-editor-'+width+'.png'});await page.screenshot({path:'.test-artifacts/phase1-'+width+'.png',fullPage:true});await context.close();
 }
 console.log('OK: Eigene SOC-Tastatur 0/100, Grenzblockade, Rücktaste, Test-Fahrtag, bestehender Tag bearbeiten, Navigation aus/ein über Einstellungen, Neustart, F01-Inline-Editor mit 42 Fahrtagen, Duplikaten, ID-Zuordnung, Speichern/Abbrechen ohne Sprung nach oben und Layout 320/390/412 (Simulation).');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
