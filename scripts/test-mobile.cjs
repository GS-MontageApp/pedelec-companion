const {readApp,writeApp,settled,browserOptions,openDataSection}=require('./browser-data.cjs');
const assert = require('node:assert/strict');
const {mkdirSync} = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.TEST_BASE_URL;
if (!url) throw new Error('TEST_BASE_URL muss auf die HTTP-LAN-Adresse zeigen (z. B. http://<PC-Adresse>:5173/).');
const storageKey = 'pedelec-v1';

async function inputSoc(page, value) {
  await page.getByRole('button',{name:'Eingabe löschen',exact:true}).tap();await settled(page);
  for(const digit of String(value)) await page.getByRole('button',{name:digit,exact:true}).tap();await settled(page);
}
async function savedSession(page) {
  return (await readApp(page)).sessions[0];
}
async function assertLayout(page) {
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Kein horizontaler Überlauf');
}
(async()=>{
  const browser=await chromium.launch(browserOptions());
  try {
    mkdirSync('.test-artifacts',{recursive:true});
    for(const [width,height] of [[320,568],[390,844],[412,915]]) {
      const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,locale:'de-DE',timezoneId:'Europe/Berlin'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);
      if(!process.env.ALLOW_SECURE_TEST)assert.deepEqual(await page.evaluate(()=>({secure:isSecureContext,uuid:typeof crypto.randomUUID})),{secure:false,uuid:'undefined'},'Regression muss auf echter unsicherer HTTP-Origin laufen');
      await assertLayout(page);
      await page.getByRole('button',{name:'Ladevorgang starten',exact:true}).tap();await settled(page);
      const startButton=page.getByRole('button',{name:'Laden starten',exact:true});
      assert.equal(await startButton.isDisabled(),true);
      await inputSoc(page,12);
      assert.equal(await page.locator('output').innerText(),'12%');
      assert.equal(await startButton.isEnabled(),true);
      await startButton.tap();await settled(page);
      assert.equal(await page.getByRole('dialog').count(),0);
      assert.equal((await savedSession(page)).measurements[0].soc,12);
      await page.getByRole('button',{name:'Zwischenstand',exact:true}).tap();await settled(page);
      assert.equal(await page.locator('input[type="date"]').count(),0);
      assert.equal(await page.locator('input[type="datetime-local"]').count(),0);
      assert.equal(await page.getByLabel('Messuhrzeit').getAttribute('step'),'60');
      assert.match(await page.getByLabel('Messuhrzeit').inputValue(),/^\d{2}:\d{2}$/);
      await page.screenshot({path:`.test-artifacts/time-${width}.png`});
      const before=await page.locator('.timer>span').innerText();
      await page.waitForFunction(value=>{const timer=document.querySelector('.timer>span');return !!timer&&timer.textContent!==value;},before,{timeout:5000});
      assert.notEqual(await page.locator('.timer>span').innerText(),before,'Timer läuft im Editor');
      await inputSoc(page,22);
      await page.getByRole('button',{name:'Zwischenstand speichern'}).tap();await settled(page);
      await page.getByRole('button',{name:'Zwischenstand',exact:true}).tap();await settled(page);
      await inputSoc(page,12);
      await page.getByRole('button',{name:'Zwischenstand speichern'}).tap();await settled(page);
      assert.match(await page.getByRole('alert').innerText(),/22 %.*12 %/s);
      await page.screenshot({path:`.test-artifacts/warning-${width}.png`});
      assert.equal((await savedSession(page)).measurements.length,2,'Warnung speichert noch nichts');
      await assertLayout(page);
      await page.getByRole('button',{name:'Wert korrigieren'}).tap();await settled(page);
      await inputSoc(page,24);
      await page.getByRole('button',{name:'Zwischenstand speichern'}).tap();await settled(page);
      await page.getByRole('button',{name:'Zwischenstand',exact:true}).tap();await settled(page);
      await inputSoc(page,12);
      await page.getByRole('button',{name:'Zwischenstand speichern'}).tap();await settled(page);
      await page.getByRole('button',{name:'Trotzdem übernehmen'}).tap();await settled(page);
      assert.equal((await savedSession(page)).measurements.at(-1).quality.status,'flagged');
      assert.equal(await page.locator('.quality-flag').count(),1);
      await page.getByRole('button',{name:'Reisen',exact:true}).tap();await settled(page);await assertLayout(page);
      await page.getByRole('button',{name:'Einstellungen',exact:true}).tap();await settled(page);await assertLayout(page);
      await page.getByRole('button',{name:'Laden',exact:true}).tap();await settled(page);
      await page.reload();await settled(page);
      assert.equal(await page.getByRole('button',{name:'Beenden',exact:true}).count(),1);

      // Retroactive high point changes the chronological relation to a later point.
      const shifted=await readApp(page),shiftedSession=shifted.sessions[0],stamp=Date.now();
      shiftedSession.startedAt=stamp-30*60000;shiftedSession.measurements=shiftedSession.measurements.slice(0,2);
      shiftedSession.measurements[0].measuredAt=shiftedSession.startedAt;shiftedSession.measurements[1].measuredAt=stamp-10*60000;
      await writeApp(page,shifted);
      await page.reload();await settled(page);
      await page.getByRole('button',{name:'Zwischenstand',exact:true}).tap();await settled(page);
      const earlier=await page.evaluate(()=>{const d=new Date(Date.now()-20*60000);return {time:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};});
      await page.getByRole('button',{name:'Datum ändern'}).tap();await settled(page);
      await page.getByLabel('Messdatum').fill(earlier.date);
      await page.getByLabel('Messuhrzeit').fill(earlier.time);
      await inputSoc(page,30);
      await page.getByRole('button',{name:'Zwischenstand speichern'}).tap();await settled(page);
      assert.match(await page.getByRole('alert').innerText(),/spätere Messwert.*22 %/s);
      await page.getByRole('button',{name:'Trotzdem übernehmen'}).tap();await settled(page);
      assert.deepEqual((await savedSession(page)).measurements.map(m=>m.soc),[12,30,22]);
      assert.equal(await page.locator('.quality-flag').count(),2);
      await page.screenshot({path:`.test-artifacts/charging-${width}.png`,fullPage:true});
      await page.getByRole('button',{name:'Beenden',exact:true}).tap();await settled(page);
      const beforeCancel=await savedSession(page);
      await page.getByRole('button',{name:'Zurück',exact:true}).tap();await settled(page);
      assert.deepEqual(await savedSession(page),beforeCancel);
      await page.getByRole('button',{name:'Beenden',exact:true}).tap();await settled(page);
      await inputSoc(page,30);
      await page.getByRole('button',{name:'Ladung abschließen',exact:true}).tap();await settled(page);
      assert.ok((await savedSession(page)).endedAt);
      assert.equal(await page.getByRole('button',{name:'Ladevorgang starten',exact:true}).count(),1);
      assert.match(await page.getByRole('status').innerText(),/beendet und in diesem Browser gespeichert/);
      const completed=await savedSession(page);
      await page.reload();await settled(page);
      assert.deepEqual(await savedSession(page),completed,'Abgeschlossene Sitzung bleibt unverändert nach Reload');
      await openDataSection(page,'charges');const history=page.getByRole('region',{name:'Deine Ladehistorie'});
      const record=history.locator('details').first();
      assert.match(await record.locator('summary').innerText(),/Start-SOC.*12 %.*End-SOC.*30 %/s);
      await record.locator('summary').tap();await settled(page);
      assert.equal(await record.locator('.measurement').count(),4);
      assert.equal(await record.locator('.quality-flag').filter({hasText:'für Prognosen gesperrt'}).count(),2);
      assert.match(await record.innerText(),/akku-001/);
      assert.match(await record.innerText(),/Compact Charger · 2 A/);
      await assertLayout(page);
      await page.getByRole('button',{name:'Einstellungen',exact:true}).tap();await settled(page);
      await page.getByRole('button',{name:/Mein zweites Pedelec/}).tap();await settled(page);
      await page.getByRole('button',{name:'Laden',exact:true}).tap();await settled(page);
      await openDataSection(page,'charges');assert.match(await history.locator('summary').innerText(),/Riese & Müller/);
      // Existing legacy data, arbitrary snapshots and unsorted storage must survive reading.
      const seeded=await readApp(page),olderSeed=structuredClone(seeded.sessions[0]);
      delete olderSeed.endSoc;delete olderSeed.endMeasurementId;olderSeed.id='legacy-history';olderSeed.startedAt-=86400000;olderSeed.endedAt-=86400000;
      olderSeed.measurements.forEach(m=>{m.id+='-old';m.measuredAt-=86400000;delete m.quality;});
      olderSeed.snapshot.bike.name='Historisches Testfahrrad';olderSeed.snapshot.configuration.id='alte-konfiguration';olderSeed.snapshot.batteries[0].name='Historischer Akku';olderSeed.snapshot.charger.name='Historischer Lader';
      seeded.sessions.unshift(olderSeed);await writeApp(page,seeded);const storedBeforeReload=await readApp(page);
      await page.reload();await settled(page);
      assert.deepEqual(await readApp(page),storedBeforeReload);
      await openDataSection(page,'charges');assert.equal(await history.locator('details').count(),2);
      assert.equal(await history.locator('details').first().getAttribute('data-session-id'),completed.id);
      const older=history.locator('details').nth(1);await older.locator('summary').tap();await settled(page);
      assert.match(await older.innerText(),/Historisches Testfahrrad/);
      assert.match(await older.locator('summary').innerText(),/End-SOC.*Nicht erfasst/s);
      assert.match(await older.innerText(),/alte-konfiguration/);
      assert.match(await older.innerText(),/Historischer Akku/);
      assert.match(await older.innerText(),/Historischer Lader/);
      assert.match(await older.innerText(),/Ungeprüft · für Prognosen gesperrt/);
      await assertLayout(page);
      await page.screenshot({path:`.test-artifacts/history-${width}.png`,fullPage:true});
      assert.deepEqual(errors,[]);
      console.log(`OK: ${width}×${height}, kompletter Ladeablauf, Historie, Snapshot, Altbestand, Sortierung und Reload`);
      await context.close();
    }
    for(const failure of ['creation']) {
      const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      await context.addInitScript(kind=>{
        if(kind==='storage')IDBObjectStore.prototype.put=function(){throw new DOMException('Speicher voll','QuotaExceededError');};
        else crypto.getRandomValues=function(){throw new Error('ID konnte nicht erzeugt werden');};
      },failure);
      const page=await context.newPage();await page.goto(url);
      await page.getByRole('button',{name:'Ladevorgang starten',exact:true}).tap();await settled(page);await inputSoc(page,12);
      await page.getByRole('button',{name:'Laden starten',exact:true}).tap();await settled(page);
      assert.match(await page.getByRole('alert').innerText(),failure==='storage'?/nicht dauerhaft gespeichert/:/ID konnte nicht erzeugt werden/);
      assert.equal(await page.getByRole('dialog').count(),failure==='storage'?0:1);
      console.log(`OK: Verständliche Fehlermeldung bei ${failure}`);
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();await page.goto(url);
    await page.getByRole('button',{name:'Ladevorgang starten',exact:true}).tap();await settled(page);await inputSoc(page,32);
    await page.getByRole('button',{name:'Laden starten',exact:true}).tap();await settled(page);
    const beforeEnd=await savedSession(page);
    await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Speicher voll','QuotaExceededError');};});
    await page.getByRole('button',{name:'Beenden',exact:true}).tap();await settled(page);
    await page.getByLabel('Akkustand unbekannt').check();
    await page.getByRole('button',{name:'Ladung abschließen',exact:true}).tap();await settled(page);
    assert.match(await page.getByRole('alert').innerText(),/Änderung nicht gespeichert/);
    assert.equal(await page.getByRole('dialog').count(),1);
    assert.deepEqual(await savedSession(page),beforeEnd,'Fehlgeschlagenes Beenden überschreibt nicht den zuvor gespeicherten Stand');
    await page.reload();await settled(page);
    assert.equal(await page.getByRole('button',{name:'Beenden',exact:true}).count(),1,'Vorher gespeicherte laufende Sitzung wird wiederhergestellt');
    await context.close();
    console.log('OK: Speicherfehler beim Beenden wird angezeigt, vorheriger Speicherstand bleibt erhalten');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
