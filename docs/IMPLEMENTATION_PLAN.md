# Nächste Version: Umsetzung

Ausgangslage: Branch `codex/ui-prototyp`, React/TypeScript/Vite mit drei Tabs, localStorage `pedelec-v1`, vollständiger manueller Ladeassistent und Ladehistorie. Abschlussdialog und 100-%-Rückfrage wurden beibehalten.

1. **Persistenz:** Dexie/IndexedDB, getrennte Tabellen für Stammdaten, Konfigurationen, Sitzungen, Messpunkte, Fahrtage, Tourlinks und Bosch-Tagesstatistiken. Transaktionale Schreibvorgänge, Revisionsprüfung gegen konkurrierende Tabs, sichtbare Lese-/Schreibfehler. Erlaubter Neustart in neuer DB, alte localStorage-Daten nicht gelöscht.
2. **Datensicherung/Testläufe:** vollständiger JSON-Export, strikt versionierter Import mit Schema-/Referenzprüfung, expliziter Ersetzungsbestätigung und atomarem Schreiben. Testkennzeichnung beim Start/nachträglich; nur Hinweis auf mögliche Tests, keine automatische Löschung. Eigene Filtergrenze für Lerndaten.
3. **Fahrtenbuch:** eine Tagesetappe als Einheit, Ladepausenzuordnung, Bilanz in Prozentpunkten, Konfigurations-Snapshot, später ergänzbarer Komoot-Link und lokale GPX-Auswertung. Optionale Bosch-Angaben nur für den ganzen Fahrtag.
4. **PWA/Pages:** Basispfad `/pedelec-companion/`, Manifest/PNG-Icons, precachender Service Worker, sichtbare Updatebestätigung; Workflow für Tests, Build und Pages-Deployment vom Arbeitsbranch.
5. **Qualität:** Fachtests, vorhandene mobile Lade-Regression, Produktivbuild mit Offline-Neustart, Download/Import und Worker-Update. API-Machbarkeit separat dokumentiert. Android-Nachtestanleitung in README.

Offene externe Schritte: Branch committen/pushen und im Repository Pages als „GitHub Actions“ aktivieren. Lokale Tests sind keine Behauptung eines bereits erfolgreichen GitHub-Deployments oder eines Tests auf einem echten Android-Gerät.
