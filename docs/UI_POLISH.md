# Ä13a – Bedienung und Darstellung

## Umgesetzt

- Restzeit als Stunden und Minuten (15 Min., 1 Std., 1 Std. 15 Min., 2 Std. 5 Min.). Zahl und zugehörige Zeiteinheit bleiben zusammen. Die bisherige Aufrundung auf fünf Minuten war tatsächlich in `chargeForecast` vorhanden; nur diese wurde durch Aufrundung auf ganze Minuten ersetzt. Absoluter Prognose-Endzeitpunkt, Modell, Kalibrierung und SOC-Werte bleiben unverändert.
- Die laufende Uhr berechnet die verbleibenden Minuten aus der gleichen absoluten Endzeit. Neue gültige SOC-Zwischenmessungen waren bereits neue Zeit-/SOC-Anker und bleiben es. Es werden keine geschätzten SOC-Messpunkte erzeugt.
- Uhrzeit und „Uhr“ als untrennbare Zeile, Datum als separate Zeile. Fehlende Grundlagen und Überfälligkeit bleiben explizit gekennzeichnet.
- Zwischenstand links und Beenden rechts, gleiche Höhe, mindestens 44-Pixel-Touch-Flächen, erster Button breiter. Sicherheitsdialoge unverändert.
- Aktive Ladekacheln in DOM- und visueller Reihenfolge: Ladung, Blick nach vorne, Zwischenstände, Ladesetup. Auf Desktop ebenfalls Prognose direkt unter aktiver Ladung. Setup bleibt vollständig bedienbar; die Ladegerät-Auswahl bleibt während einer aktiven Sitzung wie bisher gesperrt.
- Das Dokument ist der vorhandene Scrollcontainer. CSS `scroll-snap-type: y proximity`, `scroll-snap-stop: normal`. Genau ein Snap-Ziel pro betroffenem Reiter: laufende Ladung, Fahrtag-Karte, Fahrtenbuch. Keine weiteren Kacheln werden zu Snap-Zielen. Lange Snap-Karten können weiterhin vollständig durchgescrollt werden; keine Pflicht-Einrastung und keine Bildschirmseiten-Navigation.
- Nach erfolgreich gespeicherter Lade-Zwischenmessung zur Prognose scrollen. Nicht beim Öffnen, Abbrechen oder fehlgeschlagenem Speichern. Sanft, außer bei reduzierter Bewegung; dann ohne Animation. Feste Navigation und Scroll-Abstände berücksichtigt. Nach einer 100-%-Messung hat zunächst der bestehende Bestätigungsdialog Vorrang; bei Weiterlaufen wird danach gescrollt. Bei bestätigtem Abschluss gibt es keinen Sprung zur nun inaktiven Prognose.
- Shortcut aus Manifest entfernt; URL-Auswertung, Shortcut-Prop und Dialog-Sonderbehandlung entfernt. Alte Shortcut-URLs werden wie normale Starts behandelt. Aktive Ladung hat Vorrang, sonst aktiver Fahrtag, sonst zuletzt gewählter Bereich. Die reguläre SOC-Erfassung bleibt unverändert.
- Gesamtverbrauch als zusammengehörige Zahl und kleineres Prozentzeichen, auch 125 %. Kein Rechenmodell geändert.

## Schutz des Bestands

Keine Änderungen an Datenbankschema, Datenbankversion, Persistenz, Backupformat, Snapshots oder Messwerten. Keine Migration und keine Datenbereinigung. Änderungen an Berechnungen beschränken sich auf die erlaubte Minutenauflösung der Restzeitanzeige. Bestehende Zuordnungen, Löschfunktionen, Plausibilitätsbestätigungen und Start-/Abschlussabläufe bleiben erhalten.

Launcher entscheiden selbst, wann sie ein aktualisiertes Manifest übernehmen. Ein eventuell noch sichtbarer alter Shortcut startet nur die normale App; keine Websitedaten löschen und keine Neuinstallation zum Erzwingen durchführen. Native Scroll-Snap-Physik unterscheidet sich zwischen Browsern. Die Automatisierung prüft CSS-Ziele und freie Erreichbarkeit langer Inhalte, ersetzt aber keinen Finger-Scrolltest am echten Android-Gerät.

## Tests und Android-Abnahme

Gezielte Fachtests: Dauerformate 0/15/60/75/110/125 Minuten, minutenweiser Countdown bei identischer Endzeit, neuer Messanker ohne künstliche Punkte, reguläre Startpriorität.

`pnpm run test:ui-polish`: 320/360/390/412/1280 Pixel, reduzierte Bewegung, Uhr/Datum, gleich hohe nebeneinanderliegende Buttons, tatsächliche Kachelpositionen, erfolgreicher Scroll mit sichtbarer Prognose, kein Prognose-Scroll bei Öffnen/Abbruch/Speicherfehler, drei gezielte Snap-Karten, lange Lade- und Fahrtaglisten, 125 % in einer Zeile, entferntes Manifest-Shortcut, Offline-Neustart mit unveränderten Daten. Isolierte synthetische Browserdaten, kein echter Android-Gerätetest.

Auf Android:

1. Online aktualisieren und Versionskennung unter Einstellungen kontrollieren. Vorhandene Daten prüfen, keine Websitedaten löschen.
2. Mit laufender Ladung Buttons, Kachelreihenfolge und Uhrzeit/Datum ansehen. Die Restzeit soll als Stunden/Minuten und bei längerer Beobachtung minutenweise sinken.
3. Zwischenstand öffnen und abbrechen: kein Sprung zur Prognose. Einen echten SOC speichern: aktualisierte Prognose wird sanft sichtbar. Timer läuft weiter, kein Reload.
4. In Laden, Reisen und Daten langsam an der jeweiligen Hauptkarte vorbeiscrollen; leichtes Einrasten möglich, weiter- und zurückscrollen jederzeit möglich. Lange Listen bis zum Ende prüfen.
5. Gesamtverbrauch mit Prozentzeichen in einer Zeile kontrollieren. App schließen und offline starten: aktive Ladung vor Fahrtag, sonst zuletzt gewählter Bereich; Daten unverändert.

Nicht umgesetzt: individuelles Ladeziel, neue Prognosekurve, Erinnerungen, GPX-/Komoot-Erweiterungen oder umfassende Ä04/Ä05-Plausibilitätsregeln.

Lokaler Prüfstand: 74 Fach-/Speichertests bestanden; TypeScript und Produktionsbuild erfolgreich. Sämtliche bestehenden Lade-, Fahrtag-, Lösch-, Zuordnungs-, Langlisten-, Offline-/Backup-/Updateprüfungen bestanden. Finale Ä13a-Prüfung auf 320/360/390/412/1280 Pixeln erfolgreich, einschließlich visueller Kontrolle. Ein während des Neubaus gestarteter Browserlauf wurde verworfen und nach vollständigem Build erfolgreich wiederholt. Kein echter Android-Gerätetest durch Codex.

Ä13a.1: Die Ladekarte ist inzwischen auch ohne aktive Ladung ein Snap-Ziel. Die Fahrtag-Position liegt ca. 40–48 px höher; die Überschrift bleibt sichtbar. Beim Fahrtenbuch markiert ein kurzer Anker den Kartenanfang, damit lange Listen den nächsten Hauptbereich nicht festhalten. Die Historie liegt unter Daten und verwendet Haupt- und Einzelakkordeons. Siehe `DATA_MANAGEMENT.md`.
