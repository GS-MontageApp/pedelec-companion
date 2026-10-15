# Ladebedienung: Fehleranalyse und Regression

## Version vom 15.10.2026: IndexedDB, PWA und Fahrtenbuch

Der bisherige localStorage-Adapter wurde durch Dexie ersetzt; die fachlichen Lade- und Abschlussprüfungen bleiben erhalten. Der erlaubte Neustart verwendet eine neue DB, ohne `pedelec-v1` zu löschen oder automatisch zu übernehmen. Die bisherigen Persistenztests prüfen jetzt IndexedDB einschließlich Transaktions-Rollback, Schließen/Wiederöffnen, Schutz vor konkurrierenden Tabs und Schutz vor unbeabsichtigtem Reset bei fehlenden Metadaten.

Fachtests prüfen außerdem JSON-Schema/Version/Referenzen, vollständigen Export/Import, Testkennzeichnung und Lernfilter, Tagesbilanz mit Zwischenladung, Fahrtag ohne Tour, Komoot-Linkvarianten (3151148876), Beibehaltung von Freigabeparametern sowie GPX-Strecke/Höhen/Pausen, GPS-Ausreißer, fehlende Werte, Segmente und abgelehnte XML-Entitäten. Insgesamt 32 Fachtests.

Mobile Lade-Regression über HTTP-LAN mit Touch auf 320 × 568, 390 × 844 und 412 × 915: Start, SOC, Timer, Zwischenstände, Auffälligkeit, Rückdatierung, Abschluss mit bekanntem/unbekanntem Wert, 100-%-Ja/Nein ohne Duplikat, Historie, Snapshots, Profilwechsel, Wiederherstellung und Schreibfehler. Die Testhilfen warten auf die tatsächliche asynchrone IndexedDB-Speicherung.

Der Produktionsbuild wird gesondert über localhost (sicherer Kontext) geprüft: Manifest und Worker-Kontrolle; Fahrtag zunächst ohne, anschließend mit Komoot/GPX und Bosch-Tagesdaten; Testflag beim Start und nachträglich; echter Browser-Download eines JSON-Backups; ungültige Version, Importabbruch und bestätigte Wiederherstellung; Offline-Neustart und erneute IndexedDB-Lesezugriffe. Ein geänderter gebauter Worker simuliert eine neue Version mit sichtbarer Bestätigung; danach bleiben Daten beim Update und erneuten Offline-Start erhalten. Die gebaute Worker-Datei wird nach dem Test wiederhergestellt. Eine gesperrte IndexedDB zeigt die Lesefehlermeldung.

TypeScript und Produktionsbuild werden ebenfalls geprüft. Diese Version wurde lokal in Windows mit Chromium-basiertem Edge und mobilen Touch-Viewports geprüft, **nicht auf einem echten Android-Gerät**. Die GitHub-Actions-Datei ist vorbereitet; ein erfolgreiches Deployment auf GitHub wird nicht aus lokalen Prüfungen abgeleitet. API-Recherche und Grenzen stehen separat in `API_FEASIBILITY.md`.

## Erweiterung: expliziter Abschluss-SOC und 100-%-Bestätigung

„Beenden“ ist jetzt eine Abfrage, keine unmittelbare Zustandsänderung. „Zurück“ verwirft nur die Eingabe. Bekannte Werte werden mit Endzeitpunkt und abschließendem Messpunkt gespeichert; unbekannte Werte erhalten `endSoc: null`, ohne Messpunkt. Neue optionale Felder `endSoc` und `endMeasurementId` ergänzen das bisherige Format, ohne alte Sitzungen umzuschreiben. Alte Sitzungen ohne diese Angaben zeigen „Nicht erfasst“ als End-SOC. Die frühere Anzeige des letzten Zwischenstands als Endwert ist damit ersetzt.

Ein 100-%-Zwischenstand öffnet eine explizite Ja-/Nein-Rückfrage. Zustimmung verwendet die vorhandene Messpunkt-ID ohne Duplikat. Ablehnung ändert weder Sitzung noch Timer. Die bereits erfasste Messzeit bleibt beim Wiederverwenden erhalten; Endzeitpunkt ist die Bestätigung. Die Demo-Prognose wurde nicht verändert.

Ergänzte Fachtests prüfen bekannte/unbekannte und nullprozentige Endwerte, tatsächliche Abschlusszeit nach einer Warnung, Bestätigung auffälliger Werte, Prognoseausschluss, Erhalt früherer Bestätigungszeitpunkte, unveränderte Snapshots, 100-%-Referenz ohne Duplikate und Altdaten ohne Endwert. Die Browserprüfung `scripts/test-finish.cjs` prüft auf 320, 390 und 412 Pixel Breite mit Touch über HTTP-LAN: Abbruch ohne Speicheränderung, laufender Timer, Korrektur und Bestätigung, bekannte/unbekannte Werte, 100-%-Ja/Nein, Darstellung und Reload. Kein echtes Android-Gerät wurde für diese Erweiterung verwendet.

## Erweiterung: abgeschlossene Ladevorgänge

Persistenzprüfung: Bereits vor der Erweiterung wurde beim Beenden `endedAt` gesetzt und der gesamte App-Zustand einschließlich abgeschlossener Sitzungen unter `localStorage['pedelec-v1']` gespeichert. Es fehlte die Anzeige. Die Erweiterung ändert weder Schlüssel noch Datenformat und führt keine Migration oder Löschung aus.

Neue Prüfungen: Speicherung und vollständige Wiederherstellung von abgeschlossenen Sitzungen, Qualitätskennzeichnungen, alten Einträgen ohne Qualitätsfeld und historischen Snapshots; unveränderte bestehende Daten beim Lesen und Anlegen weiterer Sitzungen; Erhalt des vorherigen Speicherstands bei fehlgeschlagenem Schreiben. Historie sortiert nach Startzeit absteigend, ohne die gespeicherte Reihenfolge zu verändern. Der End-SOC ist explizit als letzter gemeldeter Messwert gekennzeichnet.

Mobile Browserprüfungen erweitern auf allen drei Breiten den vollständigen Ablauf um Beenden, Speicherbestätigung, Reload, Öffnen der Historie, sämtliche Messwerte und Auffälligkeiten. Ein Profilwechsel und gespeicherte historische Beispiel-Snapshots prüfen die Trennung von aktuellen Stammdaten. Ein absichtlich unsortierter Altbestand bleibt beim Neuladen bytegleich erhalten und erscheint dennoch korrekt sortiert. Ein Speicherfehler erst beim Beenden zeigt die Warnung und stellt nach Reload die zuvor gespeicherte laufende Sitzung wieder her.

Diese Prüfungen verwenden ausschließlich frische isolierte Browserkontexte; vorhandene Testdaten im normalen Browserprofil werden nicht angefasst. Auch diese Erweiterung wurde nicht auf einem echten Android-Gerät getestet.

Branch: `codex/ui-prototyp`. Testumgebung: Windows 11, Playwright mit installiertem Chromium-basiertem Microsoft Edge, Touch-Emulation. **Kein echtes Android-Gerät getestet.**

## Reproduktion vor der Änderung

In frischen Browserkontexten (390 × 844, Touch aktiviert) wurde dieselbe Bedienung ausgeführt: Ladevorgang starten, Ziffern 3 und 2 tippen, „Laden starten“ tippen.

| Beobachtung | localhost | HTTP-LAN 192.168.178.31 |
|---|---|---|
| `isSecureContext` | true | false |
| `typeof crypto.randomUUID` | function | undefined |
| Lokaler Speicher Schreib-/Löschtest | erfolgreich | erfolgreich |
| Eingabe | 32 % | 32 % |
| Startbutton | aktiviert | aktiviert |
| JavaScript-Fehler | keiner | `crypto.randomUUID is not a function` |
| Gespeicherte Sitzungen | 1 | 0 |
| Eingabedialog nach Tippen | geschlossen | weiterhin offen |

Der Fehler entstand im ausgelösten Submit-Handler bei der Erstellung des Messpunkts, noch vor der Erstellung der Sitzung oder dem Speichern. Der Handler enthielt zwei direkte Aufrufe von `crypto.randomUUID`. Der über Touch erfolgreich erreichte, aktive Button und der Fehler im Handler schließen eine blockierende CSS-Überlagerung als Ursache dieses reproduzierten Fehlers aus. Die SOC-Validierung war ebenfalls erfolgreich. Ein anderer Dialogtext („Los geht's“) auf dem Smartphone ändert diese API-Abhängigkeit nicht.

## Änderung

HTTP-taugliche zufällige UUID-v4-IDs aus `crypto.getRandomValues`. Keine Abhängigkeit von `randomUUID`, keine Zeitstempel-IDs oder unsicheren Zufallstokens. Start-/Erfassungsfehler erscheinen im Dialog. Speicherfehler werden gesondert angezeigt; die Sitzung bleibt vorläufig im Arbeitsspeicher erhalten. Fachliche Funktionen sind in `src/charging.ts` getrennt testbar.

Messzeiten werden lokal in HH:mm eingegeben, mit optionalem Datum. Intern bleiben vollständige Zeitstempel und getrennte Erfassungszeiten erhalten. Rückdatierung ist erlaubt, Zukunft und Zeiten vor Ladestart werden abgewiesen. Die Startminute wird auf den exakten Ladestart begrenzt.

Sinkende Werte erfordern eine ausdrückliche Bestätigung. Geprüft wird chronologisch einschließlich der Folgen einer rückdatierten Eingabe. Qualität und Bestätigung werden persistiert. Auffällige und ungeprüfte Messungen sind durch `forecastMeasurements` von späteren Prognosen ausgeschlossen. Die Datenstruktur ist für eine empirisch zu definierende Prüfung schneller Anstiege vorbereitet.

## Automatisierte Prüfung

- Fachtests: HTTP ohne `randomUUID`, SOC-Grenzen, lokale Minutenauflösung, Startminute, Rückdatierung, Mitternacht, ungültige/frühere/zukünftige Zeiten, 12 → 22 → 12, Bestätigung, rückwirkend hohe/niedrige Werte, Prognoseausschluss, Zeitstempel-Timer, gleiche Zeitstempel und Speicherfehler.
- Mobile Browserprüfung über echte HTTP-LAN-Origin: 320 × 568, 390 × 844, 412 × 915, Touch aktiviert. Unsicherer Kontext und fehlende `randomUUID` werden explizit überprüft.
- Vollständiger Ablauf: Start, Eingabe, Timer im Editor, Zwischenstände, „Wert korrigieren“, „Trotzdem übernehmen“, Rückdatierung mit Datum, chronologische Anzeige, Auffälligkeitskennzeichnung, Tabwechsel, Reload, Beenden.
- Fehlerfälle: blockiertes `localStorage.setItem` sowie künstlich fehlgeschlagene ID-Erzeugung. Beide erzeugen verständliche Meldungen.
- Kein horizontaler Überlauf in allen Tabs und im Warnungsdialog. Screenshots für Ladeansicht, Zeitdialog und Warnung.
- TypeScript-Prüfung und Produktionsbuild.

## Smartphone-Nachtest

Im gleichen WLAN die aktuelle IPv4-Adresse des Windows-PCs auf Port 5173 öffnen. Seite in Chrome neu laden; bei veralteter Ansicht Tab schließen und erneut öffnen. Vorhandene Browserdaten müssen nicht gelöscht werden.

Mit 12 % starten, 22 % als Zwischenstand speichern, anschließend 12 % eingeben. Die Warnung muss erscheinen. Zuerst korrigieren, danach erneut eine Ausnahme bewusst bestätigen. Die auffällige Kennzeichnung muss nach Neuladen erhalten bleiben. Uhrzeit rückwirkend ändern und gegebenenfalls das Datum über „Datum ändern“ wählen. Timer während der Eingabe beobachten und abschließend beenden. Keine Herstellerprognose oder Hintergrundbenachrichtigung erwarten.
