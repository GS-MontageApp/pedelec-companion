# Ä11 – Gemeinsamer SOC-Verlauf für Fahren und Laden

## Bedienung

Neue Start-, Zwischen- und End-SOC-Eingaben öffnen immer leer. Der bisher bekannte SOC bleibt Orientierung in der Karte und wird nicht als Eingabe übernommen. Nur beim gezielten Bearbeiten eines gespeicherten Werts wird dessen alter Wert angezeigt.

Laden während eines aktiven Fahrtags: Die bewusst eingegebene Startzahl wird mit dem zeitlich letzten dokumentierten Wert derselben Fahrrad-/Akku-Konfiguration verglichen. Ein Anstieg (beispielsweise 80 → 81 %) zeigt eine Erklärung und **Wert korrigieren** / **Trotzdem übernehmen**. Ein gleicher oder niedrigerer Wert ist zulässig. Derselbe konkrete Hinweis gilt für neue Fahrt-Zwischenmessungen, Fahrtende und manuell eingegebene Fahrtag-Endwerte. Eine dokumentierte, eindeutig verknüpfte laufende Ladung erklärt einen SOC-Anstieg während ihres Zeitintervalls. Keine allgemeine Steigungs-, Geschwindigkeits- oder Hersteller-Ladekurvenprüfung.

Bestätigte Abweichungen werden mit eingegebenem Wert, Referenzwert/-ID, bekanntem Referenzzeitpunkt und Bestätigungszeit gespeichert. Es erfolgt keine automatische Korrektur. Entsprechende Tagesbilanzen sind vorläufig und nicht für reale Auswertungen freigegeben; Ladestart-Abweichungen werden auch aus späteren Lernwerten ausgeschlossen. Frühere bestätigte Abschlussabweichungen bleiben nach dem Fortsetzen erhalten.

## Zuordnung und Zeitgrenzen

Beim Start beziehungsweise Abschluss einer Ladung wird die Zuordnung zusammen mit der Ladung atomar gespeichert, sofern genau ein passender Fahrtag aktiv ist: gleiches Fahrrad, gleiche Konfigurations-ID und Akku-IDs, bekannte passende Zeitgrenzen, passender Teststatus und keine andere Zuordnung. Fortsetzungen berücksichtigen frühere Abschlusszeiten und Wiederaufnahmezeiten. Ladungen vor dem Fahrtbeginn oder nach dem tatsächlichen Ende werden nicht automatisch zugeordnet; Zeiträume zwischen früherem Abschluss und Fortsetzung brauchen eine bewusste Prüfung.

Unbekannte Fahrtzeiten, gleiche Fahrrad-/Datumseinträge, abweichende Testkennzeichnungen und andere Unsicherheiten führen zur sichtbaren **Ladezuordnung prüfen** mit Bestätigungsdialog. Bestehende Zuordnungen werden weder überschrieben noch verdoppelt. **Als eigenständige Ladung behalten** speichert die bewusste Nichtzuordnung. Bereits vorhandene unzugeordnete Ladungen werden nicht bei jedem App-Start stillschweigend umgeschrieben; passende Altdaten können über die sichtbare Prüfung zugeordnet werden. Bestehende manuelle Häkchen bleiben gültige Datensatzverknüpfungen. Widersprüche bleiben sichtbar und werden nicht als zuverlässige Bilanz verrechnet.

## Gemeinsamer Verlauf und Bilanz

Unter Reisen und Daten zeigt dieselbe abgeleitete Chronologie Fahrtbeginn, Fahrtmessungen, Ladebeginn, Lade-Zwischenstände, tatsächliches Ladeende, Weiterfahrt mit dokumentiertem End-SOC sowie aktuelles beziehungsweise früheres Fahrtende. Es werden keine Fahrtmessungen aus Ladungen dupliziert oder erfunden. Eine Ladung bleibt separat in der Ladehistorie. Unbekannte Zeitpunkte und Endwerte bleiben ausdrücklich unbekannt.

Die große Zahl in der Fahrtag-Karte ist die Gesamtbilanz: **Start − Ende + Summe gültiger Zwischenladungen**. Beispiel: **99 − 70 + 5 = 34 Prozentpunkte**. Fahrtmessungen, Weiterfahrt-Anzeigen und historische Zwischenabschlüsse sind keine zusätzlichen Verbrauchssummanden. Jede Ladungs-ID zählt höchstens einmal. Start und End-SOC sowie die Summe der Zwischenladungen werden getrennt ausgewiesen; ohne zugeordnete Ladung heißt es **Keine Zwischenladung erfasst**. Beim aktiven Tag lautet die Zahl ausdrücklich **Verbrauch bis zum letzten dokumentierten SOC**. Laufende/unvollständige Ladungen, ungeklärte Zuordnungen oder doppelte Fahrtage verhindern eine scheinbar vollständige Bilanz. Testbilanzen sind als solche gekennzeichnet. Keine Umrechnung in vermeintlich gemessene Wh.

## Fahrtag löschen

**Nur Fahrtag löschen · Ladungen behalten** ist immer voreingestellt. Optional können **Fahrtag und zugeordnete Ladungen löschen** und anschließend einzelne ausdrücklich aufgelistete Ladungen gewählt werden. Ohne gewählte Ladung bleibt diese Löschvariante gesperrt. Angezeigt werden ID, Fahrrad und Zeitpunkte. Nur exklusiv diesem Fahrtag zugeordnete, passende Ladungen sind auswählbar. Doppelte oder widersprüchliche Zuordnungen lassen kein Mitlöschen zu. Kein anderer Ladevorgang desselben Datums wird aufgrund seines Datums mitgelöscht. Erst die abschließende Bestätigung schreibt die atomare Änderung.

## Bestandsschutz und Tests

Keine Tabellen-/Indexänderung, keine Änderung der Dexie-Datenbankversion und keine Migration/Zurücksetzung. Zusätzliche Warnungs-/Nichtzuordnungsfelder sind optional. Alte Backups bleiben einlesbar; neue Warnungsfelder benötigen beim Import Ä11 oder neuer. Zeitstempel, Messpunkt-IDs, Snapshots, Testkennzeichnungen und Fortsetzungsverläufe bleiben erhalten. Wiederherstellen einer Sicherung löst keine automatische Neuzuordnung aus.

Lokal: `pnpm test`, `pnpm run typecheck`, `pnpm run build`, `pnpm run test:soc-journey`. Die bestehenden Lade-, Ä08-, Ä10-, F01-Langlisten- und PWA-Updateprüfungen bleiben in CI aktiv. Tests verwenden synthetische Daten in isolierten Browserprofilen. Mobile Viewports 320×568 / 390 / 412 Pixel und Desktop 1280 Pixel sind Simulationen, kein echter Android-Gerätetest.

Android-Praxis: PWA online aktualisieren und Version kontrollieren. Fahrtag mit 99 % starten, Zwischenstand 80 % erfassen. Ladestart muss leer sein; 81 % prüfen, korrigieren oder bestätigen. Mit 80 % starten und bei 85 % beenden: Reisen muss ohne zusätzlichen Messpunkt 85 % kennen. Fahrtag bei 70 % beenden: Bilanz 34 Prozentpunkte. App schließen und offline öffnen, Verlauf kontrollieren. Bei Testdaten beide Löschvarianten samt Abbrechen prüfen und anschließend die Ladehistorie kontrollieren. Keine Websitedaten löschen.

Prüfstand Ä11: 59 Domain-/Persistenztests bestanden; TypeScript und Produktionsbuild erfolgreich. Browserprüfungen für Laden, Ä08, Ä10, F01-Langlisten, Ä11, Offline/Backup und Service-Worker-Update bestanden (Chromium, simulierte Bildschirmgrößen). Kein echter Android-Gerätetest durch Codex.

Seit Ä13 verwendet die Oberfläche das kompakte Prozentzeichen statt des ausgeschriebenen Worts „Prozentpunkte“. Die mathematische SOC-Bilanz bleibt unverändert. Einzelne Ladungen können seit Ä12 mit bestätigter ID-Auswahl gelöscht werden; ihre Fahrtag-Zuordnungen werden dabei mit entfernt. Siehe `CHARGE_MANAGEMENT.md`.
