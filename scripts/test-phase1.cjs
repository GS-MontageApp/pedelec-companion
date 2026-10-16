const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {readApp,settled,browserOptions}=require('./browser-data.cjs');
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
 await page.screenshot({path:'.test-artifacts/phase1-'+width+'.png',fullPage:true});await context.close();
 }
 console.log('OK: Eigene SOC-Tastatur 0/100, Grenzblockade, Rücktaste, Test-Fahrtag, bestehender Tag bearbeiten, Navigation aus/ein über Einstellungen, Neustart und Layout 320/390/412 (Simulation).');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
