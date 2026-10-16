# Pedelec Companion – Produktkonzept (Stand: UI-Prototyp)

## Zielgruppe
Kleine Gruppe von bis zu sechs Personen mit unterschiedlichen Pedelecs (Bosch alt/neu, Yamaha), Android und iPhone. Keine Benutzerkonten in v1. Installierbare, offline-freundliche Web-App.

## Kernbereiche
1. **Laden (Startansicht)**: Fahrrad, SOC 0–100, Ladegerät, Start, Zeit seit Start, geschätzte Restdauer und Uhrzeit des Ladeendes, Zwischenstand mit SOC und korrigierbarer Messuhrzeit, Beenden.
2. **Reisen**: spätere reichweitenbasierte Touren- und Campingplatzplanung unter Berücksichtigung von Gepäck und Akkus. In Iteration 1 nur Vorschau.
3. **Einstellungen**: Fahrräder, Ladegeräte, physische Akkus, aktuelle Akkukonfiguration, genau ein aktives Fahrrad.

## Fachliche Regeln
- SOC ist bei Bosch DualBattery ein angezeigter gemeinsamer Prozentwert; nicht pro Einzelakku extrapolieren.
- Jeder physische Akku hat eine dauerhafte Identität. Ein Ausbau oder Defekt löscht keine Historie.
- Akku-Konfigurationen sind zeitlich versioniert. Beispiel: Akku 1 + Akku 2 wird später Akku 1 + Akku 3.
- Nennkapazität und tatsächlich verfügbare Kapazität unterscheiden. SOH, Zyklen, Kilometer optional, inklusive Messzeitpunkt und Datenquelle.
- Ladesitzungen verweisen auf Snapshot der damaligen Konfiguration, Charger und Bike.
- Verschiedene Fahrrad-/Akku-/Laderkombinationen haben unterschiedliche empirische Ladeverläufe.
- Messungen und Schätzfehler langfristig speichern; spätere Prognosemodelle können von Messhistorie lernen. Keine naive lineare Ladezeit als zuverlässige Vorhersage darstellen.
- Später optionaler freiwilliger Austausch von Ladeprofilen, mit Herkunftskennzeichnung und ohne ungefragte Datenübermittlung.
- Browser-Speicher kann gelöscht werden: für später JSON-Export/-Import vorsehen.
- Warnung fünf Minuten vor Ladeende ist ein langfristiges Ziel, aber ohne verlässlichen Hintergrundmechanismus in einer rein lokalen PWA nicht garantiert.

## Nicht-Ziele des ersten Prototyps
Echte Reichweiten-/Routenberechnung, Push, Server, Konten, Synchronisation, Hersteller-API, zuverlässiges Prognosemodell.

## Akzeptanzkriterien für den ersten Codex-Lauf
- Auf Android-/iPhone-Breite gut bedienbare deutsche Oberfläche.
- Drei Tabs, Laden initial ausgewählt, feste Navigation inklusive Safe Area.
- Eigener SOC-Ziffernblock erzwingt ganzzahlige Werte 0–100.
- Laden starten, Zwischenstand erfassen (Uhrzeit korrigierbar), beenden.
- Laufzeit ist timestamp-basiert und übersteht Tabwechsel.
- Fahrrad- und Ladegeräteauswahl visuell und funktional demonstriert.
- Beispielakkus sind separat modelliert; historische Konfigurationen werden nicht überschrieben.
- Demodaten/-prognosen eindeutig gekennzeichnet.
- README und erfolgreicher Build.

## Aktueller Ausbau Ä12/Ä13

Die ursprüngliche Demo-Prognose ist durch eine gekennzeichnete Näherung bis fest 100 % ersetzt. Unbekannte Grundlagen führen zu keiner Zahl. Keine Live-SOC-Messung, kein automatisches Ladeende. Einzelne abgeschlossene Ladungen sind nach Bestätigung löschbar. Details und Modellgrenzen: `CHARGE_MANAGEMENT.md`.
