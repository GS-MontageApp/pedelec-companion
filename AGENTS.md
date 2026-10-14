# Codex-Arbeitsanweisungen

Projekt: Pedelec Companion. Sprache der Benutzeroberfläche und Dokumentation: Deutsch.

## Ziel dieser ersten Iteration
Implementiere einen hochwertigen, bedienbaren, mobilen Look-and-Feel-Prototyp. Keine echte Bosch-/Yamaha-Integration, keine echte Push-Benachrichtigung und keine als zuverlässig ausgegebene Ladeprognose.

## Stack
React, TypeScript, Vite, Tailwind CSS, Lucide Icons. PWA-freundlich, responsive, mobile-first, iOS-inspiriert ohne native UI vorzutäuschen. Achte auf Safe Areas und gute Android-/iPhone-Bedienbarkeit.

## Navigation
Fixierte Bottom-Navigation: Reisen, Laden, Einstellungen. Starttab: Laden.

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
