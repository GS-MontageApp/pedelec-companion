const {readApp,settled,browserOptions}=require('./browser-data.cjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {chromium}=require('playwright');
const url=process.env.TEST_BASE_URL;
if(!url)throw new Error('TEST_BASE_URL muss eine HTTP-LAN-Adresse angeben.');
const button=(page,name)=>page.getByRole('button',{name,exact:true});
async function digits(page,value){await button(page,'Eingabe löschen').tap();await settled(page);for(const digit of String(value))await button(page,digit).tap();await settled(page);}
async function saved(page){return (await readApp(page)).sessions[0];}
async function start(page,soc){await button(page,'Ladevorgang starten').tap();await settled(page);await digits(page,soc);await button(page,'Laden starten').tap();await settled(page);}
async function fullPoint(page){await button(page,'Zwischenstand').tap();await settled(page);await digits(page,100);await button(page,'Zwischenstand speichern').tap();await settled(page);assert.match(await page.getByRole('dialog').innerText(),/Akku vollständig geladen\? Möchtest du den Ladevorgang jetzt abschließen\?/);}
(async()=>{
 const browser=await chromium.launch(browserOptions());
 try{
  mkdirSync('.test-artifacts',{recursive:true});
  for(const [width,height] of [[320,568],[390,844],[412,915]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,locale:'de-DE',timezoneId:'Europe/Berlin'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
   if(!process.env.ALLOW_SECURE_TEST)assert.deepEqual(await page.evaluate(()=>[isSecureContext,typeof crypto.randomUUID]),[false,'undefined']);
   await start(page,22);
   const initial=await saved(page);
   await button(page,'Beenden').tap();await settled(page);
   assert.match(await page.getByRole('dialog').innerText(),/Wie hoch ist der Akkustand beim Abklemmen des Ladegeräts\?/);
   assert.equal(await button(page,'Ladung abschließen').isDisabled(),true);
   const timer=await page.locator('.timer>span').innerText();
   await page.waitForFunction(value=>document.querySelector('.timer>span')?.textContent!==value,timer,{timeout:5000});
   await digits(page,80);await button(page,'Zurück').tap();await settled(page);assert.deepEqual(await saved(page),initial);
   await button(page,'Beenden').tap();await settled(page);await digits(page,12);await button(page,'Ladung abschließen').tap();await settled(page);
   assert.match(await page.getByRole('alert').innerText(),/22 %.*12 %/s);assert.deepEqual(await saved(page),initial);
   await button(page,'Wert korrigieren').tap();await settled(page);await digits(page,80);
   await page.screenshot({path:`.test-artifacts/finish-${width}.png`});
   await button(page,'Ladung abschließen').tap();await settled(page);
   let result=await saved(page);assert.equal(result.endSoc,80);assert.equal(result.measurements.length,2);
   assert.equal(result.measurements.at(-1).measuredAt,result.endedAt);
   assert.match(await page.locator('.session-record').first().locator('summary').innerText(),/End-SOC.*80 %/s);
   await page.reload();await settled(page);assert.deepEqual(await saved(page),result);

   await start(page,22);await button(page,'Beenden').tap();await settled(page);await page.getByLabel('Akkustand unbekannt').check();
   await button(page,'Ladung abschließen').tap();await settled(page);result=await saved(page);
   assert.equal(result.endSoc,null);assert.equal(result.measurements.length,1);assert.equal(result.endMeasurementId,undefined);
   assert.match(await page.locator('.session-record').first().locator('summary').innerText(),/End-SOC.*Nicht erfasst/s);

   await start(page,22);await fullPoint(page);
   let full=await saved(page);assert.equal(full.endedAt,undefined);assert.equal(full.measurements.length,2);
   await button(page,'Nein, weiterlaufen lassen').tap();await settled(page);assert.deepEqual(await saved(page),full);
   assert.equal(await button(page,'Beenden').count(),1);
   await button(page,'Beenden').tap();await settled(page);await page.getByLabel('Akkustand unbekannt').check();await button(page,'Ladung abschließen').tap();await settled(page);
   assert.equal((await saved(page)).endSoc,null,'Selbst ein vorheriger 100-%-Wert darf unbekannten End-SOC nicht ersetzen');

   await start(page,22);await fullPoint(page);full=await saved(page);
   await page.screenshot({path:`.test-artifacts/full-confirm-${width}.png`});
   await button(page,'Ja, Ladevorgang abschließen').tap();await settled(page);result=await saved(page);
   assert.equal(result.endSoc,100);assert.deepEqual(result.measurements,full.measurements,'Kein doppelter Messpunkt bei Bestätigung');
   assert.equal(result.endMeasurementId,full.measurements.at(-1).id);assert.ok(result.endedAt>=full.measurements.at(-1).measuredAt);
   await page.reload();await settled(page);assert.deepEqual(await saved(page),result);

   await start(page,80);await button(page,'Beenden').tap();await settled(page);await digits(page,20);await button(page,'Ladung abschließen').tap();await settled(page);
   await button(page,'Trotzdem übernehmen').tap();await settled(page);result=await saved(page);
   assert.equal(result.endSoc,20);assert.equal(result.measurements.at(-1).quality.status,'flagged');
   assert.equal(result.measurements.at(-1).quality.confirmedAt,result.endedAt);
   const record=page.locator('.session-record').first();await record.locator('summary').tap();await settled(page);
   assert.match(await record.innerText(),/Abschlusswert/);assert.match(await record.innerText(),/Auffällig · bestätigt · für Prognosen gesperrt/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.reload();await settled(page);assert.deepEqual(await saved(page),result);assert.deepEqual(errors,[]);
   await context.close();console.log(`OK: Abschlussdialog ${width}×${height}: Zurück, bekannt/unbekannt, Korrektur/Bestätigung, 100 % Ja/Nein, keine Duplikate, Reload`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
