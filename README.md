# Pedelec Companion

Deutsche mobile React-/TypeScript-/Vite-App mit Tailwind, Lucide, Dexie/IndexedDB und Offline-PWA. Vier Bereiche: Reisen, Laden, Daten, Einstellungen. Kein Backend, keine Konten, keine automatische Hersteller- oder Komoot-Datenabfrage.

## Lokal starten

Node.js 24 und pnpm 11 empfohlen (mindestens Node 22.18 für die Fachtests).

```sh
pnpm install
pnpm dev
```

Browser: http://localhost:5173/pedelec-companion/ . Smartphone im selben WLAN: die von Vite angezeigte Netzwerkadresse verwenden, z. B. http://192.168.178.31:5173/pedelec-companion/ . Der Projektpfad ist jetzt auch lokal Bestandteil der URL.

```sh
pnpm test
pnpm run typecheck
pnpm run build
pnpm preview
```

Der Produktionsbuild liegt in `dist/`; Preview normalerweise unter http://localhost:4173/pedelec-companion/ .

## GitHub Pages

Ziel: https://gs-montageapp.github.io/pedelec-companion/ . Vite-Basispfad, Manifest, Start-URL, Scope, PNG-Icons und Service Worker sind dafür eingerichtet. `.github/workflows/pages.yml` prüft bei Push/PR auf `codex/ui-prototyp` Tests, Build, mobile Bedienung und Offline-PWA. Nur Push beziehungsweise manueller Workflow auf diesem Branch darf anschließend das Pages-Artefakt deployen. PRs veröffentlichen nicht.

Einmalig auf GitHub unter Repository → Settings → Pages → Build and deployment als Source **GitHub Actions** wählen. Danach die Änderungen auf `codex/ui-prototyp` committen und pushen oder dort den Workflow auslösen. Die Datei allein veröffentlicht noch nichts; lokaler Build und lokale Browserprüfungen sind kein Nachweis eines erfolgreichen GitHub-Deployments. Es sind keine API-Secrets für diese Version erforderlich.

## PWA und Updates

Für Android-Installation und Offline-Start die HTTPS-Adresse auf GitHub Pages verwenden. Ein Service Worker funktioniert auf einer unverschlüsselten HTTP-LAN-Adresse nicht; `localhost` ist für lokale Entwicklung eine Ausnahme. Nach dem ersten vollständigen Online-Laden bereitet die App Oberfläche und Assets für Offline-Nutzung vor. Daten liegen getrennt davon in IndexedDB. Kein externes Karten-/Navigationsmaterial wird gespeichert oder vorgetäuscht.

Neue Builds verwenden versionierte Asset-Hashes. Bei einer wartenden neuen Version zeigt die App „Neue Version verfügbar“. Offene Eingaben zuerst speichern oder schließen, dann „Gespeichert – jetzt aktualisieren“ wählen. Ein laufender, gespeicherter Ladevorgang wird nach dem Reload anhand seiner Zeitstempel wiederhergestellt. Kein erzwungener Reload während der Eingabe. Prüfung auf Updates beim Öffnen, Fokussieren, Wiederverbinden und stündlich; alte precache-Caches werden bei Aktivierung bereinigt. Ein vollständiger Offline-Start setzt einen zuvor erfolgreichen Online-Start voraus.

## Speicherung und Sicherung

Neue Daten liegen in der Datenbank `pedelec-companion-v2` (Dexie-Schema 1). Tabellen: Fahrräder, physische Akkus, zeitlich gültige Konfigurationen, Ladegeräte, Sitzungen, Messpunkte, Fahrtage, Tourlinks, Bosch-Tagesangaben und Einstellungen mit Revision. Sitzungen behalten ihre damaligen Snapshots. Schreibvorgänge sind atomar; ein Fehler rollt die gesamte Änderung zurück. Änderungen aus anderen Tabs werden erkannt und nicht still überschrieben. Lesefehler zeigen eine Wiederholungsmöglichkeit, ohne die Datenbank zurückzusetzen.

Der ausdrücklich erlaubte Datenneustart erfolgt in dieser neuen DB. Der alte `localStorage`-Schlüssel `pedelec-v1` wird weder gelesen noch migriert oder gelöscht. Alte lokale Testdaten sind daher nicht automatisch Teil der neuen Historie. Innerhalb der neuen Version bleiben alle neuen Daten beim Neuladen und Offline-Start erhalten. Browserprofile, HTTP-LAN und GitHub-Pages-HTTPS sind getrennte Speicherorte. Browserdaten können gelöscht werden: regelmäßig exportieren.

Unter Einstellungen **JSON-Sicherung exportieren** wählen und die heruntergeladene Datei prüfen. Das Backup enthält sämtliche Anwendungsdaten einschließlich Stammdaten, Messpunkten, Qualitätskennzeichnungen und Fahrtenbuch. Import akzeptiert nur `app=pedelec-companion`, Schema-Version 1 und vollständige gültige Daten/Referenzen. Erst die Bestätigung „Daten ersetzen“ führt eine atomare Wiederherstellung aus. Keine stille Zusammenführung. Bei laufender Sitzung ist das Ersetzen gesperrt. Ein Fehler vor oder während des Imports beschädigt den vorherigen Stand nicht. Alte localStorage-JSON-Dateien sind kein Backup dieses neuen Schemas.

## Ladeassistent und Testläufe

Eigenes SOC-Ziffernfeld: Ganzzahlen 0–100. Zwischenstände erlauben lokale Messuhrzeiten HH:mm; Datum nur über „Datum ändern“. Mess- und Erfassungszeit sind getrennt. Nachträgliche Messungen ab Ladestart bis jetzt sind möglich; in der Startminute gilt der genaue Startzeitpunkt als Untergrenze.

„Beenden“ fragt den SOC beim Abklemmen. „Zurück“ ändert die Sitzung nicht. Ein bekannter End-SOC erhält einen Abschlussmesspunkt; „Akkustand unbekannt“ speichert keinen erfundenen Endwert. Bei 100-%-Zwischenständen wird ausdrücklich nach einem Abschluss gefragt. Zustimmung referenziert den vorhandenen Messpunkt ohne Duplikat; Ablehnung lässt Sitzung und Timer weiterlaufen.

Sinkende Werte erfordern eine Bestätigung, auch bei Rückdatierung. Auffällige Messungen bleiben für Prognosen gesperrt. Die Historie bleibt chronologisch mit Details, Messzeiten, Endwerten und Setup-Snapshots verfügbar. Unbekannte Endwerte stehen als „Nicht erfasst“.

Testkennzeichnung ist beim Start und nachträglich im aufgeklappten Historieneintrag möglich. Sehr kurze Sitzungen (unter 2 Minuten) und Auffälligkeiten erzeugen lediglich einen Prüfhinweis; nichts wird automatisch gelöscht oder als Test umklassifiziert. `learningMeasurements` in der Prognoseschnittstelle schließt Testläufe und ungeprüfte/auffällige Messungen aus. Die angezeigten 150 Minuten sind weiterhin eine **feste Demo**, keine berechnete Ladeprognose. Keine echte Pushwarnung; insbesondere keine garantierte Benachrichtigung im Hintergrund auf iOS.

## Fahrtage, Komoot und GPX

Unter Daten einen Fahrtag mit Datum, Fahrrad, ganzzahligem Start-/End-SOC und optionalen Notizen speichern. Es ist keine Komoot-Tour erforderlich. Nachträglich „Fahrtag bearbeiten / Tour ergänzen“ wählen. Ladepausen können einem passenden Tag zugeordnet werden, wenn Fahrrad, Akkukonfiguration und lokales Datum übereinstimmen. Jede Ladepause gehört höchstens einem Fahrtag. Bei einem Fahrrad-/Datumswechsel die Zuordnung erneut prüfen.

SOC-Tagesbilanz: Start-SOC + bekannte Zwischenladungen − End-SOC. Ausgabe in **Prozentpunkten**, nicht als exakte Wh. Unbekannte, auffällige oder Test-Ladepausen machen die Bilanz ausdrücklich unvollständig. Akkukonfiguration und Nennkapazität werden separat genannt. Die Berechnung setzt die unveränderte Tageskonfiguration voraus. Diese lokale erste Version verwendet die lokale Zeitzone des Geräts; nach Zeitzonenwechsel Tageszuordnungen prüfen.

Komoot-Freigabelinks werden als Verknüpfung gespeichert. Numerische `/tour/`, `/tours/`- und `/t/`-Links, auch mit Sprachpräfix, liefern eine Tour-ID; Test-ID: 3151148876. Opaque `komoot.app`-Kurzlinks bleiben ohne lokal auflösbare ID. Keine automatische Tourdatenübernahme wird behauptet. GPX wird ausschließlich aus einer gewählten lokalen Datei ausgewertet; gespeichert werden nur abgeleitete Werte, keine Original-GPX oder vollständigen GPS-Tracks.

GPX-Näherungsverfahren `gpx-v1`: Distanz per Haversine, Segmente ohne künstliche Verbindung, Höhenänderungen ab 3 m, GPS-Sprünge über 90 km/h bzw. 5 km ohne Zeit verwerfen. Pausen mindestens 2 Minuten bei niedriger Bewegung (<0,5 m/s) oder längerem Stillstand. Aufzeichnungslücken können wie Pausen wirken. Fehlende/ungeordnete Zeit- oder Höhenwerte und verworfene Punkte werden angezeigt. Dateien maximal 10 MB / 200.000 Punkte. Kein navigations- oder vermessungstaugliches Ergebnis versprochen.

Optionale Bosch-Tagesangaben werden manuell erfasst: Motor-/Fahreranteil, durchschnittliche Fahrerleistung, Eco/Tour/Sport/eMTB/Turbo und Beladung. Sie gelten für den ganzen Tag und werden nicht auf Abschnitte verteilt. API-Machbarkeit und sichere spätere Architektur: [docs/API_FEASIBILITY.md](docs/API_FEASIBILITY.md).

## Browserprüfungen

Playwright ist Entwicklungsabhängigkeit. Standardmäßig wird installierter Microsoft Edge verwendet. Unter Linux/CI: `pnpm exec playwright install --with-deps chromium` und `TEST_BROWSER_CHANNEL=chromium`. Die bestehende Lade-Regression auf Android-ähnlichem Touch-Viewport prüft vorzugsweise die echte HTTP-LAN-Origin ohne `crypto.randomUUID`.

```powershell
$env:TEST_BASE_URL = 'http://192.168.178.31:5173/pedelec-companion/'
pnpm run test:browser
# Produktionsbuild und Preview vorher starten:
$env:TEST_PWA_URL = 'http://localhost:4173/pedelec-companion/'
pnpm run test:phase1
pnpm run test:pwa
```

Die PWA-Prüfung verwendet einen frischen Browserkontext, testet Download/Import, Fahrtage, Offline-Reload und simuliert einen Worker-Update durch temporäre Änderung der gebauten `dist/sw.js`; diese wird anschließend wiederhergestellt. Kein Anwendungscode wird dabei geändert. Screenshots unter `.test-artifacts/`. Diese automatisierten Tests sind **keine Tests auf einem echten Android-Gerät**.

## Android-Nachtest

1. Die veröffentlichte HTTPS-Adresse online in Chrome öffnen, vollständig laden und optional „Zum Startbildschirm hinzufügen“ verwenden.
2. Ladevorgang als Test starten, Zwischenstand erfassen, Abschlussdialog und 100-%-Rückfrage testen. In der Historie Testflag und Messpunkte prüfen, neu laden und erneut öffnen.
3. Einen normalen Ladevorgang abschließen; unter Reisen einen Fahrtag ohne Komoot speichern und die Ladepause zuordnen. Bilanz prüfen. Später den Komoot-Link 3151148876 und eine eigene GPX ergänzen. Optionale Tagesangaben erfassen.
4. Einstellungen → JSON exportieren. Im Android-Downloads-Ordner Datei prüfen. Dieselbe Sicherung auswählen: erst abbrechen, dann erneut auswählen und Wiederherstellung bestätigen. Ungültige JSON-Datei versuchen; vorhandene Daten müssen erhalten bleiben.
5. App vollständig schließen, Flugmodus aktivieren und erneut über das Startbildschirm-Symbol öffnen. Historie, Fahrtage und neu erfasste Daten müssen lokal verfügbar bleiben. Externe Komoot-Links funktionieren offline naturgemäß nicht.
6. Nach einem neuen Deployment wieder online gehen. Updatehinweis abwarten bzw. App fokussieren, offene Eingaben speichern und Update bestätigen. Daten und laufende gespeicherte Sitzung müssen erhalten bleiben.

## Entwicklungsphase 1: Fahrtage und Daten

Start- und End-SOC im Fahrtenbuch verwenden denselben grünen Ziffernblock wie Laden. Zulässig sind ausschließlich ganze Zahlen von 0 bis 100, auch bei Testdatensätzen und Importen. Ein Fahrtag ist die kumulierte Tagesaufzeichnung je Fahrrad und lokalem Kalenderdatum. Existiert er bereits, die angebotene Bearbeitung öffnen. Historische Duplikate bleiben sichtbar und werden bis zur Klärung von realen Auswertungen ausgeschlossen; es wird nichts automatisch gelöscht oder zusammengeführt.

Fahrtage lassen sich ausdrücklich als Test markieren. Die Markierung bleibt beim Bearbeiten, Speichern und Sichern erhalten; abhängige GPX-/Bosch-Daten gehören weiterhin zu diesem Fahrtag. Test-Fahrtage werden über die zentrale Auswahl `regularRideDays` aus realen Auswertungen ausgeschlossen. Test-Ladungen zählen nicht zur realen Tagesbilanz.

Optionale Fahrtzeiten grenzen Ladepausen ein. Die Vorschläge zeigen passende abgeschlossene Sitzungen; erst das bewusste Auswählen bestätigt eine Zwischenladung. Ohne Fahrtzeiten muss der Nutzer selbst prüfen, ob sie tatsächlich zwischen den Fahrten lag. Ladungen nach dem letzten Fahrtende werden bei bekannten Zeitgrenzen nicht berücksichtigt. Unbekannte SOC-Endwerte und auffällige Ladungen ergeben keine vollständige Bilanz. Gleiche IDs werden nie doppelt berechnet. Die SOC-Bezugsgröße kann bei Unsicherheit auf „Unbekannt oder abweichend“ gesetzt werden; dann wird keine Tagesbilanz freigegeben.

„Daten in der unteren Navigation anzeigen“ ist standardmäßig aktiv. Ausschalten entfernt nur den Footer-Punkt. Einstellungen → „Daten öffnen · Fahrtenbuch und GPX“ bleibt verfügbar. Alle Daten und die Einstellung bleiben nach Neuladen erhalten. IndexedDB-Schema und JSON-Format bleiben auf Version 1; neue Felder sind optional, alte Sicherungen lesbar. Keine neue Ladezeit- oder umfassende Fahrt-SOC-Plausibilitätslogik (Ä04/Ä05).

Prüfungen und Android-Testschritte: [docs/PHASE1_REPORT.md](docs/PHASE1_REPORT.md).
