# Ä12/Ä13 – Einzelne Ladungen löschen und Schätzung bis 100 %

## Löschung und Bestandsschutz

Unter Daten → Deine Ladehistorie den ausgewählten Datensatz öffnen und „Ladevorgang löschen“ wählen. Die Bestätigung enthält Start-/Enddatum und Uhrzeit, Fahrrad, Konfiguration, Start-/End-SOC und eindeutige ID. Unbekannte Endwerte bleiben „Nicht erfasst“. Zugeordnete Fahrtage werden mit Hinweis auf Neuberechnung genannt. Abbrechen schreibt nichts.

`deleteSession` entfernt genau die ausgewählte abgeschlossene Sitzung und diese ID aus **allen** Fahrtag-Zuordnungen. Die vorhandene transaktionale Speicherung entfernt ihre Messpunkte mit, ohne verwaiste Zuordnungen zu hinterlassen. Andere Sitzungen, Fahrtage, manuelle SOC-Punkte, Snapshots, Test- und Auffälligkeitsmarkierungen bleiben erhalten. Auch uneindeutige alte Mehrfachzuordnungen werden ausschließlich für diese ausdrücklich gelöschte ID entfernt. Laufende Ladungen müssen zuerst abgeschlossen werden.

Die gemeinsame Zeitlinie und Bilanz werden aus dem verbleibenden Zustand abgeleitet. Beispiel 100 − 60 + 10 = 50 %, nach Löschen dieser Zwischenladung 40 %. Bei zwei Ladungen bleibt die andere unverändert. Kein automatisches Korrigieren auffälliger Fahrtmessungen. Speicherfehler lassen die bisher gespeicherten Daten bestehen; die Bestätigung bleibt mit Fehlermeldung offen. Offline-Neustart und Backup verwenden dasselbe Datenmodell.

Keine Datenbankversions-, Schema- oder Migrationsänderung. Kein automatisches Löschen oder Zurücksetzen. Alte Daten benötigen keine Zusatzfelder. Das Ladeziel ist in der reinen Prognosefunktion fest 100 %, ohne neue Zielauswahl und ohne Umdeutung historischer End-SOC.

## Vorhandene Datenbasis

Jede Sitzung besitzt Startzeit, tatsächliche Messzeiten und eingefrorene Fahrrad-/Akku-/Ladegerät-Snapshots. Vorhanden sind Nennkapazität Wh, optionale manuelle SOH-Werte und Ampere. Eine gemessene nutzbare Kapazität, Temperatur, momentane elektrische Leistung, Ladeunterbrechungen und Einzelakku-Umschaltung sind nicht erfasst. Insbesondere enthalten die initialen Akkuangaben Beispielwerte, keine automatisch ausgelesenen Fahrraddaten. Das Modell verwendet den gespeicherten Snapshot, nicht ein später geändertes Profil.

## Modell `charge-estimate-v1` (`src/forecast.ts`)

Reine Ableitung ohne Schreibzugriff. Anker ist der zeitlich letzte **tatsächliche** gültige SOC-Messpunkt; unmittelbar nach Start also Start-SOC/Startzeit. Restzeit und Endzeit hängen von diesem Anker ab. Ein weiterer gemessener Wert setzt den Anker neu. Die Uhr läuft bis zur geschätzten Endzeit herunter, ohne SOC zu interpolieren oder Messpunkte zu erzeugen. Seit Ä13a Anzeige auf ganze Minuten aufgerundet; Endzeit ist ebenfalls eine Schätzung.

Eigene generische Zeitgewichtung, **keine Herstellerkennlinie**:

- 0–80 %: Faktor 1 pro SOC-Differenz
- 80–95 %: Faktor 1,5
- 95–100 %: Faktor 3

`W(s) = min(s,80) + 1,5 × max(0,min(s,95)−80) + 3 × max(0,s−95)`.

Technischer Rückfall nur für das bestehende ausdrücklich bezeichnete Bosch Nyon 2/BUI350-Setup mit Compact Charger 2 A oder Fast Charger 6 A und konsistenten Akku-IDs. Nominale 36-V-Grundlage dieser Ladegerätgeneration: [Bosch Originalanleitung BCS220/BCS230/BCS250, technische Daten](https://cdn.css-help-center.prod.connected-biking.cloud/fileadmin/EBC/Service/Downloads/Bedienungsanleitungen/MY2021/Charger/Bosch-eBike-Manual-Charger-BCS220-230-250-MY21-EEU.pdf?_=1708417638). Diese Quelle belegt die technische Spannungs-/Stromgrundlage, **nicht** unsere Zeitgewichtung oder eine DualBattery-Ladekurve.

`C = Summe(Nennkapazität × (SOH/100, sofern vorhanden, sonst 1))`

`Restdauer[h] = C / (36 × Ampere) × (W(100)−W(letzter SOC)) / 100`

SOH ist dabei nur ein manueller Kapazitätsansatz, kein Messwert der nutzbaren Energie. Die Gesamtpaketkapazität wird einmal berücksichtigt. Keine Behauptung gleichzeitigen oder sequenziellen Ladens und kein fiktiver Faktor zwei für zwei Akkus. Das aggregierte Modell bildet die reale DualBattery-Steuerung nicht nach. Temperatur, Ausgleichsladung, Verluste, Ladepausen und reale Strombegrenzungen bleiben unbekannt. Deshalb nur eine **grobe Orientierung**, keine verlässliche Ankunftszeit oder Herstellerzusage. Unbekannte Systeme erhalten ohne passende Historie keine angenommene Spannung und keine Zahl.

Mit den initialen, ausdrücklich beispielhaften 2 × 500 Wh (einmal SOH 94 %) ergibt der Kapazitätsansatz 970 Wh. Start 40 %: rund 10 h 27 min bei 2 A beziehungsweise 3 h 29 min bei 6 A (Seit Ä13a Anzeige auf ganze Minuten aufgerundet). Dies illustriert die Formel anhand konfigurierter Werte und ersetzt keine praktische Validierung am Fahrrad.

## Historische Kalibrierung

Ab mindestens drei konsistenten, passenden, abgeschlossenen **realen** Vollladungen ersetzt ein Median aus `beobachteter Dauer / (W(100)−W(Start-SOC))` den technischen Zeitfaktor. Exakt übereinstimmen müssen Fahrrad/System, Konfiguration, physische Akkus samt Kapazität/SOH und Ladegerät samt Ampere. Voraussetzung: Start ≤80 %, tatsächlich erfasste 100 %, bekannte passende Abschlussmessung, mindestens 20 Minuten, monotoner Verlauf und ausschließlich gültige geprüfte Messpunkte. Zeitanker der Kalibrierung ist das erste tatsächlich dokumentierte Erreichen von 100 %, nicht ein eventuell späteres Abklemmen. Größter/kleinster Zeitfaktor dürfen höchstens Faktor zwei auseinanderliegen. Diese konservativen Auswahlgrenzen sind Modellzulassungsregeln, keine neue allgemeine Ä04/Ä05-Plausibilitätsprüfung.

Testladungen, bestätigte Ladestart-Abweichungen, auffällige/ungeprüfte/alte ungeprüfte Messwerte, unbekannte Endwerte und fremde Setups werden ausgeschlossen. Sie werden dafür nicht gelöscht oder umklassifiziert. Ein einzelner Messabschnitt wird nicht naiv bis 100 % hochgerechnet. Eine Testladung darf eine technische Schätzung anzeigen, wird aber niemals selbst als historische Grundlage verwendet. Das Modell kann nicht nachweisen, dass eine lange Ladepause ununterbrochen war; historische Schätzungen bleiben Schätzungen.

## Anzeige und Grenzen

Ohne aktive Ladung: „– %“ statt Beispiel-SOC, Rest-/Endzeit „–“. Bei laufender Ladung ausschließlich der zuletzt dokumentierte SOC im Kreis; neue Eingabefelder bleiben leer. Ungeprüfte/auffällige aktive Messungen sperren die Prognose. Bei fehlender Grundlage: „Noch keine Schätzung möglich“. Technische und historische Grundlage stehen unter „Grundlage und Grenzen“.

Nach Überschreiten der Schätzung: „Überfällig“ und Aufforderung, den tatsächlichen Akkustand zu prüfen. Kein automatischer Abschluss und kein behauptetes Erreichen von 100 %. Manuell dokumentierte 100 % bleiben vom Bestätigungsdialog für den Abschluss getrennt. Keine Erinnerung und kein Push. `%` ersetzt das ausgeschriebene Wort Prozentpunkte in Verbrauchs- und Ladungsdifferenzanzeigen; intern bleiben es SOC-Differenzen, keine gemessenen Wh.

## Android-Abnahme

1. Online aktualisieren, Versionskennung unter Einstellungen kontrollieren. Keine Websitedaten löschen; vorher optional JSON-Sicherung exportieren.
2. Ohne aktive Ladung „– %“ und keine Demo-Restzeit prüfen. Startfeld muss leer sein. 40 % mit 2 A starten, Schätzung und Grundlagen ansehen. Nach Neustart müssen SOC und geschätzte Endzeit erhalten sein. Diesen Testlauf als Test kennzeichnen.
3. Mit gleichem Setup und 6 A einen separaten Test starten: kürzere technische Schätzung, weiterhin Ziel 100 %. Eine zusätzliche tatsächliche SOC-Messung muss den Anker aktualisieren; ohne Messung darf keine neue SOC-Zahl entstehen.
4. Bei einem Fahrtag mit Zwischenladung Verbrauch merken. In Laden genau diese Historienkarte öffnen, Löschdialog samt Daten prüfen und zunächst abbrechen. Alles bleibt erhalten. Danach bestätigen: Karte und Ladeereignisse verschwinden, Verbrauch wird neu berechnet, manuelle Fahrtmessungen bleiben.
5. Bei zwei Zwischenladungen eine löschen: zweite bleibt erhalten. Eigenständige alte Ladung löschen: kein Fahrtag wird entfernt. PWA offline schließen/öffnen und Ergebnis kontrollieren. Export/Import mit Testdaten prüfen.
6. Eine überfällige Schätzung darf den Timer nicht beenden und nicht 100 % speichern. Dafür keine persönlichen Daten oder Geräteuhr manipulieren; diesen Fall deckt die automatisierte Prüfung mit synthetisch zurückliegenden Zeitstempeln ab.

Prüfungen: `pnpm test`, `pnpm run typecheck`, `pnpm run build`, `pnpm run test:charge-management` und bestehende Lade-, Ä08/Ä10/Ä11-, Langlisten- und Offline/PWA-Tests. Browsergrößen 320×568, 390, 412 und 1280 Pixel sind Simulationen, kein echter Android-Gerätetest.

Lokaler Prüfstand: 71 Fach-/Speichertests bestanden, TypeScript und Produktionsbuild erfolgreich. Sämtliche mobilen Lade-, Ä08/Ä10/Ä11-, Langlisten-, Offline-/Backup-/PWA-Updateprüfungen bestanden. Neue Ä12/Ä13-Browserfälle bei 320/390/412/1280 Pixeln bestanden; Prognose- und Löschdialogdarstellung visuell kontrolliert. Kein echter Android-Gerätetest durch Codex.

Ä13a ergänzt Stunden-/Minutenformat, getrenntes Datum, geänderte Kachelreihenfolge und gezieltes Scrollen. Formel und Datenbasis bleiben unverändert. Siehe `UI_POLISH.md`.
