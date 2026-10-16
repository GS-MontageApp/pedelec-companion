# Entwicklungsphase 1 · Änderungs- und Prüfbericht

Umgesetzt auf `codex/ui-prototyp`: ausschließlich Ä01, Ä02, Ä03, Ä06 und Ä07. Keine Veröffentlichung oder Änderung der Demo-Ladeprognose.

## Betroffene Dateien

- `src/SocKeypad.tsx`: gemeinsames grünes Ziffernfeld; Ziffern, Löschen, Rücktaste, 0–100.
- `src/TravelDiary.tsx`: SOC über Buttons ohne Systemtastatur, aktive Eingabe, Test-Fahrtage, bestehende Tage bearbeiten, optionale Fahrtzeiten und SOC-Bezugsgröße, bestätigte Ladepausen, Duplikathinweis. Bestehende Touren, GPX-Auswertungen und Lade-IDs werden beim Ergänzen erhalten.
- `src/rideRules.ts`: SOC-Speicherprüfung, eindeutige Fahrrad-/Datumskombination, datenerhaltende Duplikatbehandlung, Tagesbilanz und Auswahl regulärer Tage für spätere Auswertungen.
- `src/travel.ts`: Vorschläge aus der Ladehistorie mit Zeitgrenzen und Information zu bereits zugeordneten Sitzungen; vorhandene GPX-Verarbeitung unverändert.
- `src/domain.ts`, `src/database.ts`, `src/persistence.ts`: optionale Test-/Zeit-/SOC-Bezugsfelder und Navigationseinstellung. Transaktionaler Schutz vor neuen doppelten Tagen. Bestätigte Sicherungsimporte dürfen historische Duplikate erhalten.
- `src/backup.ts`, `src/BackupPanel.tsx`: optionale Felder im bisherigen JSON-Format, Fahrtzeitvalidierung und Hinweis bei Duplikaten. Alte Sicherungen bleiben lesbar.
- `src/App.tsx`, `src/style.css`: Datenbereich, vier Footer-Punkte, dauerhaft gespeicherte Sichtbarkeit und fester Zugang über Einstellungen; bisherige Farben erhalten.
- `tests/phase1.test.mjs`: SOC-Grenzen einschließlich 0, ungültige externe/importierte Werte, Tages-Eindeutigkeit, Testausschluss, Persistenz/Backup, Bearbeitung, Zuordnung und Verbrauch.
- `scripts/test-phase1.cjs`, `scripts/test-pwa.cjs`, `scripts/browser-data.cjs`: mobile SOC-/Navigationsprüfung und angepasste bestehende Offline-Regression.
- `package.json`, `.github/workflows/pages.yml`: neuer Testbefehl `test:phase1`, in die bestehende CI-Prüfung aufgenommen.
- `README.md`, dieser Bericht: Bedienung und Datenregeln.

## Datenentscheidungen

Keine automatische Zusammenführung oder Löschung. Doppelte historische Fahrtage können einzeln bearbeitet/korrigiert werden; bis dahin keine reale Auswertung. Testkennzeichen fehlen in alten Tagen: regulär behandeln. Neue Felder benötigen keine neue IndexedDB-Tabellenstruktur; fehlende Footer-Einstellung bedeutet sichtbar.

Ladepausen werden über stabile Sitzungs-IDs referenziert. Auswahl einer Checkbox ist die ausdrückliche Bestätigung, keine automatische Zuordnung. Ohne verlässliche Fahrtzeiten bleiben Vorschläge zeitlich ungeklärt; die Oberfläche fordert zur Prüfung auf. Mit Fahrtzeiten schließen die Berechnungsregeln Ladungen außerhalb des Fahrtfensters aus. Bei unsicherer SOC-Bezugsgröße oder inkompatibler Konfiguration keine vollständige Bilanz. Es werden keine SOC-Nachladungen erfunden.

Die Tagesbilanz bleibt eine SOC-Differenz in Prozentpunkten, keine Wh-Prognose. Test- und unvollständige Tage dürfen nur über die dafür vorgesehenen geprüften Auswahlfunktionen in spätere reale Statistiken gelangen. Neue Ladezeitwarnungen und umfassende Fahrt-SOC-Plausibilitätsregeln wurden nicht implementiert.

## Prüfung

- 37 automatisierte Fach-/Speichertests erfolgreich (`pnpm test`).
- TypeScript und Produktionsbuild einschließlich Service Worker erfolgreich (`pnpm run build`).
- Bestehende Ladebedienung und Abschlussdialog bei 320×568, 390×844 und 412×915 erfolgreich, einschließlich unsicherer HTTP-LAN-Origin ohne `crypto.randomUUID`.
- Neue SOC-Eingabe, 0/100, Eingabegrenzen, Rücktaste, Test-Fahrtag, bestehender Tag, Footer aus/ein, Zugang über Einstellungen und Neustart bei 320/390/412 Pixel Breite erfolgreich.
- Bestehende PWA-Prüfung erfolgreich: IndexedDB, GPX, Komoot-Link, Bosch-Angaben, JSON-Export/Import, Offline-Neustart, Update und Speicherlesefehler.
- Kein eigenständiger Linter im Projekt konfiguriert.

Browserprüfungen: automatisiertes Microsoft Edge mit mobilem Touch-Viewport und deutscher Zeitzone. Kein echter Android-/iPhone-Gerätetest. GitHub Actions wurde lokal erweitert, aber dieser Änderungsstand noch nicht gepusht oder öffentlich deployt.

## Android-Praxistest

1. Zuerst unter Einstellungen eine JSON-Sicherung bestehender Daten exportieren. Neue Version lokal öffnen; die öffentliche URL enthält diese Änderungen erst nach einem späteren Deployment.
2. Daten → Fahrtag hinzufügen. Start-/End-SOC antippen: grüne Tastatur, keine Android-Systemtastatur. 0 und 100 eingeben, zusätzliche Ziffern sowie Löschen/Rücktaste prüfen.
3. Tag als Test markieren, speichern, App neu laden. Tag öffnen und bearbeiten; Testkennzeichnung, Notizen, GPX und Ladezuordnungen müssen erhalten bleiben. Test-Tage zeigen keine reale Verbrauchsbilanz.
4. Nochmals dasselbe Fahrrad und Datum wählen: vorhandenen Tag bearbeiten. End-SOC nach einer Abendfahrt ändern; es darf kein zweiter Tag entstehen. Ein anderes Fahrrad darf am gleichen Datum einen eigenen Tag haben.
5. Eine bekannte abgeschlossene Zwischenladung desselben Fahrrads prüfen und bestätigen. Beispiel 100 % Start, 55 % Ende, bestätigte Ladung von 20 auf 30 % ergibt 55 Prozentpunkte Verbrauch. Zuordnung entfernen und wieder speichern; Neuladen prüfen. Testladungen und unbekannte Endwerte dürfen keine vollständige reale Bilanz ergeben. Bei Ladung nach der letzten Fahrt: nicht bestätigen bzw. Fahrtende ergänzen.
6. Einstellungen → Daten-Footer ausblenden, neu laden, Daten über den festen Eintrag öffnen. Datensätze müssen erhalten bleiben. Footer wieder einblenden.
7. Neue JSON-Sicherung exportieren und nach bewusster Bestätigung wieder importieren. Testkennzeichen, Fahrtzeiten, Footer-Einstellung, GPX und Lade-IDs prüfen.
