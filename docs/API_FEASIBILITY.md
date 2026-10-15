# API-Machbarkeit – Stand 15.10.2026

Diese Prüfung ist von der lokalen App getrennt. Es wurden keine Zugangsdaten eingegeben, keine kostenpflichtigen Tour-/Scraper-Endpunkte aufgerufen und keine Anbieterzugriffe in das Frontend eingebaut.

## Komoot

Die [offizielle Komoot-API-Dokumentation](https://static.komoot.de/doc/external-api/v007/index.html) beschreibt eine Partnerschnittstelle mit Partnervertrag und OAuth2. Sie untersagt die Nutzung ohne entsprechenden Vertrag. Tourdetails, Koordinaten und GPX sind dokumentiert; Sichtbarkeit, Freigabetoken und freigeschaltete Regionen begrenzen den Zugriff. Ein öffentlicher Freigabelink ist deshalb kein Nachweis für eine frei nutzbare, browserseitige Daten-API.

Die öffentliche Seite `https://www.komoot.com/tour/3151148876` ließ sich mit dem Recherchewerkzeug nicht als auswertbare Quelle abrufen. Das ist **kein** Nachweis, dass die Tour nicht existiert oder privat ist. Ein direkter zulässiger Datenabruf einschließlich CORS wurde nicht verifiziert. Die App extrahiert die ID `3151148876` aus numerischen `/tour/`, `/tours/`- und `/t/`-Links, behält einen Link zur Originaltour und liest ausschließlich vom Nutzer gewählte lokale GPX-Dateien. Opaque `komoot.app`-Kurzlinks werden gespeichert, aber nicht als aufgelöste Tour-ID ausgegeben.

## Parse.bot-Komoot-API

Geprüft wurden die [offizielle Einführung](https://docs.parse.bot/introduction), die [Marketplace-Dokumentation](https://docs.parse.bot/marketplace) und zwei dokumentierte **öffentliche, schlüssellose Metadaten-GETs**:

- `https://api.parse.bot/marketplace/apis?q=komoot&limit=10`
- `https://api.parse.bot/marketplace/apis/0aec9660-5240-47d5-afa3-06745f962627`

Ergebnis: Listing `komoot-com-api`, canonical scraper `241b6f4c-0b7a-4a05-a37e-e5bb73799df8`. Der gelistete Endpunkt `get_route_details` akzeptiert den Stringparameter `route_id`. Dokumentierte Rückgabefelder umfassen Strecke, Dauer, Höhenmeter und eingebettete Koordinaten. Das Metadaten-Beispiel verwendet eine Discovery-/Smarttour-ID (`e1985976155`), keine erfolgreich abgefragte Nutzertour `3151148876`.

Der Katalog nennt `price: 1` für diesen Endpunkt. Die Einheit und eine etwaige Kostenfreiheit für ein konkretes Konto sind damit nicht abschließend geklärt. Aufrufe von `/scraper/{scraper_id}/{endpoint}` verlangen laut Anbieter einen API-Schlüssel. **Deshalb wurde `get_route_details` mit `route_id=3151148876` nicht ausgeführt.** Weder Funktionsfähigkeit für diese Tour noch Zugriffsrecht, CORS oder Datenvollständigkeit werden behauptet. Ein Marketplace-Eintrag ist kein Nachweis einer Komoot-Autorisierung. Öffentliche Metadatenbelege liegen in `parsebot-komoot-catalog.json` und `parsebot-komoot-detail.json`; keine API-Schlüssel oder Sitzungsdaten enthalten.

Für einen späteren praktischen Abruf braucht es eine Freigabe für mögliche Kosten, einen serverseitig verwalteten Schlüssel und eine Klärung der zulässigen Datennutzung. Dann Tour 3151148876 gezielt prüfen und Rohantwort, Sichtbarkeit, Einheiten, Zeitstempel, Höhen-/Koordinatenabdeckung und Fehlercodes dokumentieren. Kein Scraping von eingeloggten Sitzungen als Ersatz.

## Bosch eBike Connect / Nyon 2 (BUI350)

Bosch führt [Nyon BUI350 unter eBike system 2 und eBike Connect](https://status.bosch-ebike.com/en/). Das ist von eBike Flow / dem smarten System zu unterscheiden. Ein Zugang für ein anderes System beweist keine Nyon-Kompatibilität.

Das [offizielle Data-Act-Partnerportal](https://portal.bosch-ebike.com/data-act) nennt auch eBike-Connect-Nutzer. Es verlangt Anmeldung mit SingleKey ID, Annahme der Bedingungen für Datenempfänger und Registrierung einer Client-Anwendung mit Login-/Empfänger-URL. Damit ist ein offizieller Datenzugangsweg grundsätzlich belegt, **keine anonym frei abrufbare Nyon-API**.

Ohne Nutzerkonto/Registrierung konnten konkrete Endpunkte, Freigaben und verfügbare Felder für Nyon BUI350 nicht geprüft werden. Insbesondere Motor-/Fahreranteile, Leistungswerte, Modusverteilung, Ladeverlauf, Aufbewahrungsdauer, Granularität, historische Verfügbarkeit und mögliche Gebühren sind nicht bestätigt. Einzelne Portal-/Hilfeseiten waren im Recherchewerkzeug nicht zugänglich. Vor Integration muss Bosch die System-2-/BUI350-Abdeckung und den konkreten Datensatz bestätigen; der Nutzer muss seinen Zugriff autorisieren. Bis dahin bleiben diese Angaben manuelle optionale Tagesdaten.

## Sichere spätere Architektur (Vorschlag, nicht implementiert)

PWA → eigener HTTPS-Backend-Endpunkt → freigegebener Anbieter. Schlüssel und gegebenenfalls Refresh-Tokens ausschließlich im Secret Store des Backends; keine `VITE_*`-Schlüssel, Passwörter, Anbieter-Cookies oder Tokens in GitHub Pages, IndexedDB oder JSON-Sicherungen. OAuth mit registrierter Redirect-URI, serverseitiger Zustandsprüfung und minimalen Scopes entsprechend der tatsächlichen Anbieterdokumentation. Für Parse.bot nur feste, freigegebene Operationen und Tour-IDs, keine beliebigen Proxy-URLs. Kostenlimit, Rate-Limit, klare Einwilligung, Datenherkunft und getrennte importierte Datensätze vorsehen. Kein solches Backend wird durch diese Version benötigt oder vorgetäuscht.
