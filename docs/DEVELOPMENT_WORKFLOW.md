# Entwicklung und Veröffentlichung der Test-App

## Verbindlicher Ablauf

Ein Entwicklungsstand, ein Tester, ein Veröffentlichungsbranch: `codex/ui-prototyp` im Repository `GS-MontageApp/pedelec-companion`. Es gibt derzeit keine getrennte stabile Version.

Nach jedem Codex-Entwicklungsauftrag:

1. Aktiven Branch, Git-Status und fremde Änderungen prüfen.
2. Änderungen im vereinbarten Umfang durchführen. Tests, TypeScript und Produktionsbuild ausführen. Tatsächliche Ergebnisse und bekannte Fehler dokumentieren.
3. Neue/geänderte Dateien auf Zugangsdaten und persönliche Inhalte prüfen. Nur relevante Quellen, Konfiguration, Dokumentation und synthetische Test-Fixtures committen. Keine privaten Schlüssel, `.env`-Dateien, lokalen Datenbanken, Backups oder persönlichen GPX-/Testdaten.
4. Auf `codex/ui-prototyp` committen und pushen, ohne Force-Push. Testfehler dokumentieren, aber den gewünschten baubaren Teststand nicht allein deshalb zurückhalten. Bei fehlgeschlagenem Build darf der Quellstand zur Fehlerdokumentation trotzdem auf GitHub liegen; die CI veröffentlicht ihn nicht.
5. Actions-Lauf und öffentliche App kontrollieren. Commit-ID, Push-Status, Deployment-Status und Testergebnisse mitteilen. Kein Erfolg allein aufgrund eines lokalen Builds oder gestarteten Workflows behaupten.

Diese Regeln stehen auch in `AGENTS.md` und gelten für folgende Codex-Aufträge. Sie ersetzen keine gegebenenfalls vom Nutzer ausdrücklich angeordnete Pause oder Einschränkung.

## GitHub Actions

`.github/workflows/pages.yml` läuft bei jedem Push auf `codex/ui-prototyp`, bei Pull Requests auf diesen Branch und bei manuellem Start.

- **build**: Abhängigkeiten installieren, TypeScript und Vite bauen, Pages-Artefakt hochladen. Fehler verhindern das Deployment.
- **tests**: Separater Arbeitsplatz mit Fach-/Speichertests und mobilem Browser, Phase-1- sowie Offline-/Sicherungs-/Updateprüfungen. Einzelne Testfehler sind informativ und stoppen weitere Prüfungen nicht. Ergebniszeilen in der Actions-Zusammenfassung, Warnung bei Fehlern, Protokolle/Screenshots im Artefakt `testbericht-<Commit-SHA>` (14 Tage).
- **deploy**: Benötigt ausschließlich den erfolgreichen Build. Veröffentlicht nur `codex/ui-prototyp`, keine Pull Requests. Testergebnisse können zeitlich später eintreffen als das Deployment und müssen separat geprüft werden.

Tests laufen in einem eigenen Job: Die PWA-Tests dürfen dort vorübergehend den gebauten Service Worker verändern, ohne das Veröffentlichungsartefakt anzutasten. Neue Pushes ersetzen ältere laufende Veröffentlichungen durch die Concurrency-Regel. Keine Git-Hooks blockieren einen Push wegen Fachtestfehlern.

Nötige Einstellungen: Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Unter **Settings → Environments → github-pages → Deployment branches and tags** muss der exakte Branch `codex/ui-prototyp` erlaubt sein. Bestehende Regeln nicht pauschal deaktivieren. Workflow-Berechtigungen: global `contents: read`; ausschließlich im Deployment `pages: write` und `id-token: write`. Keine API-Secrets nötig. Das öffentliche Repository und GitHub Pages sind aktiviert; der konkrete Deployment-Lauf bestätigt die nutzbare Einstellung.

Öffentliche Test-App: https://gs-montageapp.github.io/pedelec-companion/

## PWA-Updates und Datenerhalt

Die App registriert den Service Worker mit `updateViaCache: none`. Sie prüft beim Online-Start, beim Fokussieren, beim erneuten Sichtbarwerden, beim Wiederverbinden und stündlich auf Änderungen. Offline ist keine neue Version erkennbar; fehlende Verbindung löscht keine Daten.

Eine bereitstehende Version zeigt **„Neue Version verfügbar.“** und **„Gespeichert – jetzt aktualisieren“**. Der Knopf ist während eines Ladevorgangs, offener Lade-/SOC- oder Fahrtag-Eingabe, Importbestätigung und während des Speicherns gesperrt. Erst der bewusste Klick im sicheren Zustand aktiviert den wartenden Worker und lädt neu. Aktiviert ein anderer Tab einen Worker, wird dieser Tab nicht ungefragt neu geladen. Gespeicherte Sitzungen bleiben anhand absoluter Zeitstempel erhalten.

Der Worker verwendet versionierte Precache-Assets und räumt veraltete Workbox-Caches bei Aktivierung auf. Es gibt keinen Cache-first-Abruf des Service-Worker-Skripts und keine Cache-Löschung beim normalen App-Start. Absichtlich vertagte Updates bleiben wartend, bis die Bearbeitung abgeschlossen ist und der Nutzer aktualisiert. In Einstellungen zeigt die App bei CI-Builds die kurze Commit-ID als Version.

IndexedDB `pedelec-companion-v2` ist vom Service-Worker-Cache getrennt. Dieser Auftrag ändert kein Datenbankschema und führt keine Migration/Zurücksetzung aus. Für spätere Schemaänderungen: neue Dexie-Version mit expliziter `upgrade`-Migration, Test eines realistischen Altbestands und Sicherungs-Roundtrip; niemals Datenbank löschen und neu anlegen. Die vorhandene vollständige Datenersetzung darf ausschließlich nach bewusster JSON-Importbestätigung erfolgen. Vor Gerät-/Browserwechseln regelmäßig JSON exportieren. „Websitedaten löschen“ im Browser ist kein Update und kann lokale Daten entfernen.

## Prüfungen und Grenzen

Lokal: `pnpm test`, `pnpm run typecheck`, `pnpm run build`. Vorschau starten: `pnpm exec vite preview --host 0.0.0.0 --port 4180 --strictPort`. Dann mit `TEST_PWA_URL` die Befehle `test:phase1` und `test:pwa` ausführen; für `test:browser` `TEST_BASE_URL` setzen. Automatisierte Edge-/Chromium-Prüfungen mit mobilen Viewports sind keine echten Android-Gerätetests.

Android: App online öffnen, auf Updatehinweis achten. Während einer Ladung oder offenen SOC-Eingabe muss Aktualisieren gesperrt bleiben. Eingabe schließen und Ladung abschließen; dann aktualisieren. Anschließend unter Daten und Ladehistorie gespeicherte Einträge kontrollieren, App schließen und erneut öffnen. Unter Einstellungen die angezeigte Version mit dem veröffentlichten Commit vergleichen.

## Offene Punkte

- **F01: offen**, ausdrücklich nicht in diesem Auftrag behoben. Eine fachliche Beschreibung liegt im vorhandenen Projektstand nicht vor; keine Ursache oder Lösung wird behauptet.
- **Ä04/Ä05: nicht implementieren** (spätere Plausibilitätslogik).
- **Ä08/Ä09: geplant**, unverändert außerhalb dieses Auftrags.
- Ein technisch baubarer Teststand kann fachliche Fehler enthalten. Maßgeblich sind die getrennten Testergebnisse im Actions-Bericht.

## Lokaler Prüfbericht vom 16.10.2026

- 37 Fach-/Speicher-/Kompatibilitätstests: bestanden.
- TypeScript und Produktionsbuild einschließlich generiertem Service Worker: bestanden.
- Ladebedienung und Abschlussdialog: 320, 390 und 412 Pixel Breite bestanden, einschließlich HTTP-LAN ohne Secure Context, Speicherfehlern, Historie und Reload.
- Fahrtage/SOC/Daten-Navigation: mobile Browserprüfung bestanden.
- PWA: Offline-Neustart, JSON-Import/-Export, Update beim nächsten Online-Start, Sperre während aktiver Ladung und offener Eingaben, Aktivierung aus einem zweiten Tab ohne Reload, anschließendes bewusstes Update und unveränderter IndexedDB-Inhalt bestanden.
- Tests verwenden isolierte Browserprofile und synthetische Daten. Kein echter Android-Gerätetest in diesem Auftrag.
- F01 bleibt ungeklärt offen; keine zusätzlichen bekannten Testfehler. Den tatsächlichen CI-/Deployment-Status zeigt der Actions-Lauf des veröffentlichten Commits.
