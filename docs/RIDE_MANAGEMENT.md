# Ä10 – Einzelne Fahrtage löschen und fortsetzen

## Löschen

Unter **Daten → Dein Fahrtenbuch** den betreffenden Fahrtag öffnen und **Löschen** wählen. Der Dialog nennt Datum, Fahrrad und eindeutige Datensatz-ID. **Abbrechen** verändert nichts. Erst **Fahrtag endgültig löschen** entfernt diesen Datensatz einschließlich seiner SOC-Unterdaten und Fortsetzungen sowie ausschließlich seiner abhängigen Tagesstatistik und Tourverknüpfungen. Es erfolgt keine neue Komoot-Anbindung und kein Zugriff auf externe Touren.

Standardmäßig bleiben alle eigenständigen Ladevorgänge, ihre Messungen, Qualitätshinweise und Snapshots vollständig erhalten. Seit Ä11 kann alternativ das Mitlöschen ausdrücklich ausgewählter, eindeutig diesem Fahrtag zugeordneter Ladungen bestätigt werden. Andere oder mehrdeutig zugeordnete Ladungen sind dafür nicht auswählbar; siehe `SOC_JOURNEY.md`. Die Ladezuordnung des entfernten Fahrtags entfällt mit diesem Fahrtag. Andere Fahrtage, auch solche mit gleichem Fahrrad und Datum, bleiben unverändert. Die vorhandene atomare IndexedDB-Transaktion und Revisionsprüfung verhindern teilweise Löschungen und veraltete Überschreibungen. Bei einem Fehler bleibt der Dialog mit Fehlermeldung offen; der vorherige Speicherstand bleibt erhalten. Ein aktiver Fahrtag kann nach ausdrücklicher Warnung ebenfalls gezielt gelöscht werden.

## Fortsetzen

Unter **Reisen** das gewünschte Fahrrad auswählen. Gibt es für dieses Fahrrad heute bereits einen gespeicherten Fahrtag, erscheint **Vorhandenen Fahrtag fortsetzen** anstelle eines zweiten Starts. Auch ein Fahrradwechsel im Startdialog bietet bei einem bestehenden Eintrag den Fortsetzen-Weg an. Seit Ä13a erfolgt der Zugang ausschließlich über die normale App; der PWA-Shortcut wurde entfernt.

Bei mehreren Einträgen erfolgt keine Vorauswahl. Die Auswahl zeigt Datum, Fahrrad, Start-/End-SOC, Notiz, Testkennzeichnung und die vollständige ID. Vor dem Fortsetzen muss der Nutzer ausdrücklich bestätigen, dass der bisherige Abschluss aufbewahrt und der ausgewählte Tag wieder aktiviert wird. **Abbrechen** verändert keine Daten. Es bleibt bei höchstens einem aktiven Fahrtag.

Start-SOC, bekannte Startzeit, Akkukonfiguration, Batterien, Notizen, Testkennzeichnung, bestehende Messpunkte und Ladezuordnungen bleiben erhalten. `resumptions` dokumentiert mit eigener ID und Zeitstempel die vorherigen Start-/Endwerte und verweist auf frühere Abschlussmesspunkte. Vorhandene Endmessungen behalten ihre IDs, Werte, tatsächlichen Mess- und Erfassungszeiten und heißen nun **Früherer Abschluss**. Der aktuelle End-SOC und die aktuelle Endzeit sind wieder offen; erst beim nächsten bewussten Beenden werden neue Werte erfasst. Mehrfaches Fortsetzen hängt weitere Einträge an und überschreibt keine früheren Abschlüsse.

Bei älteren Fahrtagen werden nur bereits bekannte Zeitangaben für Start-/Endmesspunkte übernommen. Fehlt eine Start-/Endzeit, bleibt sie unbekannt; es wird insbesondere weder Mitternacht noch der Fortsetzen-Zeitpunkt als angeblicher ursprünglicher Start erfunden. Der bekannte frühere End-SOC ist trotzdem im Verlauf sichtbar. Erneute Zwischenmessungen erhalten ihren tatsächlichen aktuellen Zeitstempel. Spätere Start-/Endkorrekturen im bestehenden Inline-Editor sind bewusste Eingaben; frühere Abschlüsse bleiben davon unberührt. Die Tagesbilanz verwendet weiterhin nur Start + gültig zugeordnete Ladungen − aktuellen Endwert; alte Abschlussmessungen werden nicht addiert.

## Daten und Sicherung

Nur optionale Eigenschaften bestehender `rideDays`-Objekte werden ergänzt. Keine Tabellen-/Indexänderung, keine Versionsänderung der Dexie-Datenbank und keine Migration oder Zurücksetzung. Bestehende Backups bleiben einlesbar. Neue Backups enthalten auch Fortsetzungen und alle historischen Abschlussmessungen; zum Import solcher Backups ist Ä10 oder neuer erforderlich. Ungültige Referenzen zwischen Fortsetzungen und Messpunkten werden vor dem bestätigten Import abgewiesen. Bereits heruntergeladene Sicherungsdateien werden nicht verändert.

## Prüfungen und Android-Test

- 49 Fach-/Speichertests: Löschen nach ID, Erhalt eigenständiger Ladungen, Duplikatauswahl, Startzeit unbekannt/bekannt, mehrfaches Fortsetzen, alte Endwerte, Korrekturen, Backup-Roundtrip, IndexedDB-Neuöffnung und Schutz vor veralteten Schreibzugriffen.
- `pnpm run test:ride-management`: 320×568, 390/412 Pixel Touch und 1280 Pixel Desktop; Dialoge, Abbrechen, einzelne Duplikate, bestehender Editor, Offline-Neustart, Speicherfehler mit vollständigem Rollback und sichtbare Aktualisierung nach Löschen des aktiven Tags.
- Vorhandene Ä08- und F01-Prüfungen (42 Fahrtage), Ladebedienung und PWA-Update werden weiterhin ausgeführt. Der Update-Test enthält einen fortgesetzten Fahrtag und prüft alle Daten nach echtem Workerwechsel und erneutem Offline-Start.
- Tests verwenden isolierte Browserprofile und synthetische Daten. Kein echter Android-Gerätetest in diesem Auftrag.

Auf Android die PWA online aktualisieren, unter Einstellungen die veröffentlichte Commit-Version prüfen. In Daten zunächst **Löschen → Abbrechen** testen. Unter Reisen das richtige Fahrrad wählen, einen heutigen Datensatz auswählen und das Fortsetzen bewusst bestätigen. SOC speichern, App schließen und erneut öffnen. Den neuen End-SOC erst beim Beenden erfassen. Anschließend bei einem Test-Fahrtag die Löschung bestätigen und unter Laden kontrollieren, dass seine Ladevorgänge weiterhin vorhanden sind.
