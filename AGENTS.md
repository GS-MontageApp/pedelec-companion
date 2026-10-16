# Codex-Arbeitsanweisungen

Projekt: Pedelec Companion. Sprache der Benutzeroberfläche und Dokumentation: Deutsch.

## Ziel dieser ersten Iteration
Implementiere einen hochwertigen, bedienbaren, mobilen Look-and-Feel-Prototyp. Keine echte Bosch-/Yamaha-Integration, keine echte Push-Benachrichtigung und keine als zuverlässig ausgegebene Ladeprognose.

## Stack
React, TypeScript, Vite, Tailwind CSS, Lucide Icons. PWA-freundlich, responsive, mobile-first, iOS-inspiriert ohne native UI vorzutäuschen. Achte auf Safe Areas und gute Android-/iPhone-Bedienbarkeit.

## Navigation
Fixierte Bottom-Navigation: Reisen, Laden, Einstellungen. Öffnen/Wiederaufnehmen: aktive Ladung vor aktivem Fahrtag, sonst letzten Reiter wiederherstellen. Während der Bedienung kein automatischer Wechsel.

Aktueller Ausbau: Reisen, Laden, Daten, Einstellungen. Daten enthält Fahrtenbuch und GPX; der Footer-Eintrag ist optional, der Zugang über Einstellungen bleibt bestehen.

## Laden
Aktives Fahrrad und Ladegerät deutlich zeigen. SOC als Ganzzahl 0–100, niemals 101, negative Werte, Dezimalzahlen oder Buchstaben; nutze eigenes Ziffernfeld mit Löschen und optional +/-1. Starten, Zwischenstand mit editierbarem Zeitstempel, Beenden. Laufzeit aus absoluten Zeitstempeln berechnen, nicht aus Intervall-Ticks. Timer läuft beim Bearbeiten weiter. Zustand beim Tabwechsel bewahren. Zeige eine klar als Demo markierte Restzeit/Endzeit; keine erfundenen Hersteller-Ladekurven.

## Einstellungen
Mehrere Fahrräder; genau ein aktives Fahrrad. Ladegeräte mit Ampereangabe. Physische Akkus als eigenständige Objekte mit stabiler ID, Nennkapazität Wh, optionalem SOH, Ladezyklen, Kilometerstand und Datums-/Quellenangaben. Akkukonfigurationen mit zeitlicher Gültigkeit, damit Akkuwechsel die Vergangenheit nicht überschreiben. Beispiel: Riese & Müller, Bosch Nyon 2 (BUI350), DualBattery 2 x 500 Wh, 2-A- und 6-A-Lader. Kein Zwang zu Hersteller-spezifischen Eigenschaften.

## Reisen
Schöne, deutlich als Vorschau markierte Oberfläche für Reichweite und Etappenplanung. Keine vorgetäuschte funktionierende Navigation.

## Datenmodell und spätere Ausbaustufe
Entkopple UI, Domain-Modelle, Persistenz und Prognose-Engine. Ladesitzungen referenzieren unveränderlich die damalige Fahrrad-/Akku-Konfiguration und das Ladegerät. Messpunkte mit SOC und editierbarem tatsächlichem Messzeitpunkt; zusätzlich Erfassungszeitpunkt. Später IndexedDB/Dexie, Ladehistorie, Prognoseversionen und JSON-Backup. Kein Benutzerkonto in v1; offline-first. Optionaler manueller Import/Export fremder Ladedaten später, nicht stillschweigend zusammenführen.

## Zuverlässigkeit
Eine lokale PWA kann keine garantierte Benachrichtigung fünf Minuten vor Ladeende versprechen, besonders nicht im Hintergrund/bei geschlossenem Browser auf iOS. Nur demonstrieren/kennzeichnen, nicht als funktionierend verkaufen.

## Qualität
Semantische und barrierearme Controls, 44px+ Touch-Ziele, keine horizontalen Scrollbars, verständliche Projektstruktur, README mit Installations-/Startanleitung, erfolgreiche TypeScript- und Build-Prüfung. Implementiere zunächst nur den Prototyp, kein Backend.

## Verbindlicher Entwicklungs- und Veröffentlichungsworkflow

- Einziger Tester ist der Projektinhaber. `codex/ui-prototyp` ist der laufende Entwicklungs- und Veröffentlichungsbranch, ohne getrennte stabile Version.
- Vor Änderungen aktiven Branch und Arbeitsstand prüfen. Nach jedem Codex-Entwicklungsauftrag alle relevanten, geprüften Änderungen committen und auf `origin/codex/ui-prototyp` pushen. Keine fremden Änderungen verlieren und keinen Force-Push verwenden.
- Jeder Push löst GitHub Actions und die Veröffentlichung der Test-App aus. Tests ausführen und tatsächliche Ergebnisse einschließlich Fehlern dokumentieren. Fachtestfehler dürfen Commit/Push und die Veröffentlichung eines technisch baubaren Teststands nicht grundsätzlich sperren. Ein fehlgeschlagener TypeScript-/Produktionsbuild sperrt das Deployment.
- Actions-Lauf nach dem Push prüfen. Commit-ID, Push-, Test- und Deployment-Status sowie bekannte Fehler nennen. Veröffentlichung erst bei bestätigtem Deployment und erreichbarer HTTPS-App als erfolgreich bezeichnen.
- Keine Zugangsdaten, privaten Schlüssel, lokalen Datenbanken, Sicherungen oder persönlichen Testdaten committen. Nur synthetische, unpersönliche Test-Fixtures verwenden; neue Dateien vor dem Commit prüfen.
- PWA-Updates anbieten, nicht während SOC-Eingaben, offener Bearbeitung oder laufendem Ladevorgang erzwingen. Auch Updates in anderen Tabs dürfen keine unbestätigten Reloads auslösen.
- IndexedDB bei normalen Updates erhalten. Keine automatische Löschung oder Zurücksetzung. Bei notwendigen Schemaänderungen explizite datenerhaltende Dexie-Migrationen mit Wiederherstellungstests verwenden.
- F01 ist aufgeklärt und behoben: Fahrtag-Editoren müssen direkt im per eindeutiger ID ausgewählten Datensatz erscheinen; lange Listen und vorhandene Duplikate bleiben einzeln bearbeitbar. Ä04 und Ä05 nicht implementieren. Ä08 ist umgesetzt: aktiver Fahrtag und SOC-Messpunkte mit stabilen IDs, persistenter Wiederaufnahme und bewusst zugeordneten Ladepausen. Ä09 bleibt geplant.
- Ablauf und Betrieb: `docs/DEVELOPMENT_WORKFLOW.md`.

- Ä10: Fahrtage ausschließlich nach bestätigter Auswahl anhand ihrer ID löschen; eigenständige Ladungen erhalten. Vorhandene heutige Fahrtage nach ausdrücklicher Auswahl und Bestätigung fortsetzen; frühere Abschlüsse vollständig im Fortsetzungsverlauf bewahren. Keine automatische Zusammenführung. Siehe `docs/RIDE_MANAGEMENT.md`.
