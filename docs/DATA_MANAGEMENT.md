# Ä13a.1 – Scrollverhalten und Datenverwaltung

## Bedienung

**Laden** enthält aktuelle/neue Ladung, Prognose, aktuelle Zwischenstände und Setup. Die abgeschlossene Ladehistorie wurde ohne Datenänderung nach **Daten → Deine Ladehistorie** verschoben. Dort bleiben dieselben Datensätze, Detailansichten, tatsächlichen Zeitstempel, Messwerte, Snapshots, Testmarkierungen und ID-basierten Löschfunktionen verfügbar. Aktive Ladungen werden weiterhin unter Laden geführt. Die Bestätigung nach Ladeabschluss verweist auf Daten.

Unter **Daten** gibt es zwei Hauptbereiche mit Zählern: **Dein Fahrtenbuch** und **Deine Ladehistorie**. Beim Betreten des Tabs sind beide geschlossen. Öffnen eines Bereichs schließt den anderen; erneutes Antippen schließt den aktuellen. Innerhalb jeder Liste darf genau wie in der anderen maximal ein Datensatz geöffnet sein. Erneutes Antippen schließt auch diesen, sodass alle Einträge geschlossen sein dürfen. Neueste zuerst; bestehende Datensatz-IDs bleiben maßgeblich, auch bei Duplikaten.

**Fahrtag hinzufügen** bleibt außerhalb der gefalteten Fahrtagliste erreichbar. Das neue Formular kann auch bei geschlossenem Fahrtenbuch benutzt werden. Gezieltes Bearbeiten eines vorhandenen Datensatzes öffnet den richtigen Hauptbereich und die richtige Zeile. Die Komponenten bleiben während des Zusammenklappens gemountet, damit ein Entwurf beim Wechsel nicht stillschweigend verloren geht. Offene Eingaben sperren PWA-Updates wie bisher. Die Aufklappzustände sind nur UI-Zustände und werden nicht in IndexedDB geschrieben.

Fahrtag-Zusammenfassungen enthalten weiterhin Datum, tatsächlichen Start-/End-SOC beziehungsweise ausdrücklich zuletzt bekannten SOC bei aktiven Tagen und die unverändert berechnete Bilanz. Lade-Zusammenfassungen enthalten Datum, Start-/End-SOC, tatsächliche Dauer, Fahrrad, Akkus und Ladegerät aus dem Snapshot. Fehlende Endwerte bleiben „Nicht erfasst“. Keine Schätzung ersetzt einen fehlenden Messwert.

## Umsetzung

`DataView.tsx` koordiniert das exklusiv offene Hauptpanel. Memoisierung und ein stabiler Speicher-Callback verhindern, dass die sekündliche Ladeuhr unveränderte umfangreiche Historien neu rendert. `Accordion.tsx` liefert für beide Bereiche identische zugängliche Hauptschaltflächen und dieselbe Einzel-Datensatz-Logik. Native Details-Gruppen über `name` plus ein gemeinsamer Toggle-Fallback verhindern paralleles Öffnen von Datensätzen, auch bei programmgesteuertem Öffnen zum Bearbeiten. Keine erzwungene Auswahl; Schließen aller Einträge bleibt möglich.

Das Dokument (`document.scrollingElement`, in Chromium HTML) bleibt der Scrollcontainer mit `scroll-snap-type: y proximity`, `scroll-snap-stop: normal` und Abständen zur festen unteren Navigation.

- Die Ladekarte trägt das gleiche Snap-Ziel in **Bereit zum Laden** und **Ladevorgang läuft**. Zuvor war die Klasse nur bei aktiver Ladung gesetzt.
- Die Fahrtag-Karte verwendet einen responsiven um 40–48 px reduzierten Startabstand. Der obere abgerundete Kartenrand kann dabei leicht über den Viewport ragen; Überschrift und Bedienelemente bleiben sichtbar. Keine Verschiebung oder Kürzung des Inhalts.
- Das Fahrtenbuch rastet am kurzen Anker am Kartenanfang ein. Der komplette lange ausgeklappte Bereich ist kein riesiges Snap-Rechteck mehr. Dadurch bleiben das Ende einer Liste und der folgende Hauptbereich frei erreichbar.
- Prognose-Scroll nach erfolgreicher Zwischenmessung bleibt unverändert; Abbruch und Speicherfehler lösen ihn nicht aus. Reduzierte Bewegung wird weiterhin berücksichtigt.

Keine Änderung an `forecast.ts`, Lade-/Verbrauchsformeln, `domain.ts`, Datenbankschema, Persistenz oder Backupformat. Keine Migration und keine Datenbereinigung. JSON-Sicherungen und vorhandene historische Verknüpfungen bleiben unverändert. Keine neuen Beispieldaten in der App und keine GPX-Erweiterung.

## Prüfung

`pnpm run test:data-management` verwendet ausschließlich synthetische Daten in isolierten Profilen, jeweils 100 vorhandene Fahrtage und 100 abgeschlossene Ladungen. Geprüft werden Anfangs-/Wechsel-/Schließzustände beider Hauptbereiche, identische Einzelakkordeons, Zähler/Sortierung, fehlende Endwerte, Details und ID-Verwaltung, Bearbeiten/Abbrechen, Löschen unter Erhalt manueller Fahrtmessungen, Offline-Neustart und unveränderte Datensätze nach reinen UI-Aktionen. Außerdem Dokument-Scrollcontainer, Snap-Klassen in beiden Ladezuständen, höhere Fahrtag-Position mit sichtbarer Überschrift und Prognose-Scroll ausschließlich nach erfolgreichem Speichern.

Bestehende Lade-, Fahrtag-, Zuordnungs-, Lösch-, Langlisten- und PWA-Updateprüfungen wurden an die neue UI-Navigation angepasst; ihre fachlichen Erwartungen bleiben bestehen. Die neue Prüfung ist in GitHub Actions als eigene informative Prüfung dokumentiert. TypeScript und Produktionsbuild bleiben verbindlich für die Veröffentlichung.

Android-Praxis nach dem Update:

1. Version kontrollieren. Laden ohne aktive Sitzung langsam scrollen, dann mit laufender Ladung wiederholen. Beide Zustände sollen am selben Kartenanfang sanft einrasten.
2. Unter Reisen Einrastposition ansehen: höher als zuvor, Überschrift und Schaltflächen sichtbar. Weiter- und Zurückscrollen bleibt frei.
3. SOC-Eingabe abbrechen: kein Prognose-Sprung. Einen tatsächlichen Zwischenstand speichern: Blick nach vorne wird sichtbar.
4. Unter Daten zunächst beide gefalteten Hauptbereiche samt Zählern prüfen. Fahrtenbuch öffnen, zwischen zwei Fahrtagen wechseln, wieder schließen. Zur Ladehistorie wechseln und denselben Ablauf mit zwei Ladungen prüfen.
5. Vorhandenen Ladeeintrag samt Messzeiten und Setup kontrollieren. Bearbeiten/Löschdialog zunächst abbrechen. Nur bewusst ausgewählte Testeinträge tatsächlich löschen. Lange Listen bis zum Ende prüfen.
6. App schließen und offline erneut öffnen. Datensätze, Messpunkte und Verknüpfungen bleiben erhalten; Hauptbereiche beginnen wieder geschlossen. Keine Websitedaten löschen und keine Neuinstallation erforderlich.

Browsergrößen 320/390/412/1280 Pixel sind Simulationen. Die reale Fingerbewegung und native Einrastphysik auf Android müssen zusätzlich praktisch geprüft werden; kein echter Android-Gerätetest durch Codex.

Abschließender lokaler Prüfstand: 74 Fach-/Speichertests, TypeScript und Produktionsbuild erfolgreich. Neue Prüfung mit 100 Fahrtagen und 100 Ladungen bei 320/390/412/1280 Pixeln bestanden. Bestehende Lade-, Fahrtag-, Zuordnungs-, Lösch-, Langlisten-, Scroll-, Offline-/Backup-/Updateprüfungen bestanden. Karten und Akkordeons visuell kontrolliert. Vorherige Scroll- und Renderprobleme behoben und die betroffenen Prüfungen vollständig wiederholt. Kein echter Android-Gerätetest durch Codex.

CI-Nachprüfung: Der alte 125-%-Layouttest erzeugte Fahrt- und Ladeende mit separaten Uhrzeitabfragen. Ein späterer Lade-Endzeitpunkt führte korrekt zum Ausschluss aus der Tagesbilanz. Der Test verwendet jetzt einen gemeinsamen Abschlusszeitpunkt; keine Änderung an App oder Berechnungen. Die vorherige informative CI-Prüfung war deshalb fehlgeschlagen und wurde nach der Fixture-Korrektur wiederholt.
