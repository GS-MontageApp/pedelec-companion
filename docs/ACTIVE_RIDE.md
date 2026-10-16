# Ä08 – Aktiver Fahrtag und SOC-Messungen

## Bedienung auf Android und Desktop

1. Unter **Reisen → Fahrtag starten** Fahrrad wählen und Start-SOC mit dem grünen Ziffernfeld eingeben. **Speichern** erfasst den tatsächlichen Startzeitpunkt. Test-Fahrtage ausdrücklich kennzeichnen.
2. Unterwegs **Akkustand erfassen → Ziffern → Speichern**. Datum und Uhrzeit werden automatisch erfasst. Notizen sind eingeklappt und optional; GPS, Internet oder GPX sind nicht erforderlich. Es erfolgt keine Standortabfrage.
3. In der Messliste Zwischenmessungen bewusst korrigieren (SOC, Datum/Uhrzeit, Notiz) oder nach Sicherheitsabfrage einzeln löschen. Start- und Endwerte werden über den Fahrtag-Editor korrigiert; sie können nicht versehentlich als einzelne Zwischenmessung gelöscht werden.
4. Abends **Fahrtag beenden**, End-SOC eingeben und speichern. Der abgeschlossene Fahrtag bleibt unter **Daten** einzeln bearbeitbar. Es wird kein Endwert vorzeitig erfunden.
5. Eine Zwischenladung im Bereich **Laden** durchführen. Der Fahrtag bleibt aktiv. Eindeutig passende Ladungen werden seit Ä11 automatisch im aktiven Fahrtag verknüpft. Unklare Zuordnungen werden sichtbar zur Bestätigung angeboten; manuelle Zuordnungen bleiben im Editor erhalten. Keine automatische Beendigung des Fahrtags.

Ein aktiver Fahrtag gilt appweit; ein Ladevorgang darf gleichzeitig laufen. Ein bereits vorhandener Fahrtag für dasselbe Fahrrad/Datum verhindert einen zweiten Start, ohne bestehende Datensätze zu überschreiben. Altbestandsduplikate bleiben vollständig erhalten und einzeln bearbeitbar. Ein am Folgetag beendeter aktiver Fahrtag bleibt seinem Startdatum zugeordnet.

## Öffnen und Wiederaufnehmen

Beim Laden der App und nach einem Übergang von verborgen zu sichtbar gilt: aktive Ladung → Laden; sonst aktiver Fahrtag → Reisen; sonst letzter manuell verwendeter Reiter. Der letzte Reiter ist eine lokale Komforteinstellung (`pedelec-last-tab`), kein Teil der Fachdaten. Gesperrter Zugriff auf localStorage verhindert weder Navigation noch IndexedDB-Speicherung. Offene Eingaben unterbrechen die automatische Reiterauswahl. Normale Zustandsänderungen und Timer-Ticks lösen keinen Reiterwechsel aus.

Der explizite Shortcut `?action=ride-soc` hat Vorrang und öffnet die SOC-Eingabe, beziehungsweise den Startdialog ohne aktiven Fahrtag. Der Parameter wird danach entfernt. Das Manifest enthält **Akkustand erfassen**. Android: langer Druck auf das installierte App-Symbol. Die Anzeige hängt von Launcher/Browser und der Übernahme des aktualisierten Manifests ab; die App-Eingabe funktioniert unabhängig davon. Keine Neuinstallation oder Löschung der Websitedaten nötig.

Quellen: [PWA-Shortcuts](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Expose_common_actions_as_shortcuts), [Dexie: zusätzliche Objekteigenschaften](https://dexie.org/docs/Tutorial/Design).

## Daten und Bestandsschutz

`RideDay.status` ist optional: fehlender Status bedeutet unveränderter Altbestand. Neue Fahrtage verwenden `active` beziehungsweise `completed`; ein aktiver Fahrtag hat keinen End-SOC und kein Ende. `socMeasurements` enthält Untereinträge mit eigener ID, Art (Start/Zwischenmessung/Ende), SOC, tatsächlichem Messzeitpunkt und Erfassungszeitpunkt. Korrekturen behalten ID/Erfassungszeit und ergänzen `updatedAt`. Die Eltern-ID des Fahrtags ist die eindeutige Zuordnung. Konfiguration und Akkus werden beim Start kopiert. Start-/Endkorrekturen im vorhandenen Editor halten die entsprechenden Messpunkte konsistent.

Keine neue Tabelle, kein Indexwechsel, kein Datenbank-Versionswechsel, keine Migration oder Zurücksetzung. Dexie erlaubt zusätzliche unindizierte Eigenschaften. Die vorhandenen Transaktionen und Revisionskonfliktprüfungen bleiben bestehen. JSON-Backups enthalten alle Messungen; alte Backups bleiben einlesbar. Neue Backups benötigen zum Wiederherstellen die Ä08-Version oder neuer. Alle Importprüfungen laufen vor dem ausdrücklich bestätigten Ersetzen.

Die Tagesbilanz verwendet ausschließlich **Start-SOC + gültig zugeordnete Zwischenladungen − End-SOC**. Zwischenmessungen sind Verlauf, keine zusätzlichen Verbrauchssummanden. Beispiel: 100 + 20 − 50 = 70 Prozentpunkte. Keine Umrechnung in vermeintlich gemessene Wh. Aktive Tage, Testtage, Testladungen und ungeklärte Duplikate werden nicht als reale vollständige Tagesauswertung verwendet. Ä04, Ä05, Ä09 und GPX-/Komoot-Abschnittszuordnung werden nicht implementiert.

## Prüfung

- `pnpm test`: Fach-/Speicher-/Backup-/Bestandsschutztests einschließlich Ä08.
- `pnpm run typecheck` und `pnpm run build`.
- `pnpm run test:active-ride`: 320/390/412 Pixel Touch sowie 1280 Pixel Desktop, Start/Ende, Messungen, Korrektur/Löschen, Offline-Neustart, parallele Ladung, automatische Auswahl beim Wiederaufnehmen, manueller Reiterwechsel ohne Unterbrechung, Shortcut-URL und Manifest, Bilanz, Inline-Editor und Backup.
- `pnpm run test:phase1`: bestehender Inline-Editor mit 42 Fahrtagen und Duplikaten.
- `pnpm run test:browser`: vollständige Ladebedienung und Historie.
- `pnpm run test:pwa`: tatsächlicher Workerwechsel, keine Reloads während offener Eingaben, Erhalt aktiver Fahrtage und Messpunkte beim Update, erneuter Offline-Start.

Browserprüfungen nutzen isolierte Profile und synthetische Daten. Keine Prüfung auf einem echten Android-Gerät und keine Bestätigung eines konkreten Android-Launcher-Menüs.

Lokaler Prüfstand 16.10.2026: 43 Fach-/Speichertests bestanden; TypeScript und Produktionsbuild bestanden. Ä08-Browserablauf auf allen vier Breiten, F01-Langlisten-/Duplikatprüfung, HTTP-LAN-Ladebedienung und PWA-Update mit aktivem Fahrtag/Messpunkten bestanden. Die Auswahl über den echten Android-Launcher bleibt durch den Tester am Gerät zu prüfen.

CI-Nachprüfung: Der erste Lauf f2f2e55 veröffentlichte erfolgreich, enthielt aber einen fehlgeschlagenen Ä08-Chromium-Touch-Test. Ein 320-Pixel-Ladebildschirm wurde nach dem Ladestart überbreit; Ladeaktionen brechen jetzt bei Bedarf um, die tatsächliche Gerätebreite wird strikt geprüft. Die bisher implizite Shell ließ außerdem den Fehlerstatus in einer tee-Pipeline verloren gehen; explizites bash aktiviert nun pipefail für ehrliche Testberichte. Ein grüner Gesamtstatus allein ist wegen informativer Tests weiterhin kein Nachweis bestandener Fachprüfungen.

Nachkorrektur lokal mit dem CI-Testbrowser Chromium 151 geprüft: Ä08 auf 320/390/412/1280 Pixeln einschließlich strikter Gerätebreite bestanden; Lade- und Abschlussbedienung auf allen drei mobilen Breiten bestanden.
