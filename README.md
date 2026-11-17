# bolo-style

Cypherpunk-Ballspiel für den Browser mit frei beweglichem Schläger.
Arbeitstitel im Spiel: **CIPHERBLOCK** (Platzhalter).

Die Spielmechanik ist an die Breakout-Varianten der späten 80er mit frei beweglichem
Schläger angelehnt. Alles ist eigene Umsetzung: eigener Code, eigene Vektorgrafik,
eigene Level, keine fremden Assets. Es gibt keinen Ton.

## Spielen

`index.html` im Browser öffnen. Es wird nichts nachgeladen, alles steckt in der einen Datei.
Die Grafik ist komplett vektorbasiert und läuft scharf auf jedem Bildschirm, vom Handy bis 4K.
Das Spielfeld füllt das Fenster und behält sein Seitenverhältnis; auf dem Handy am besten quer halten.

- **Maus / Finger:** Der Schläger folgt frei über das Spielfeld (waagerecht und senkrecht).
  Bei Touch sitzt er etwas über dem Finger, damit man ihn sieht.
  Die Bewegung überträgt sich auf den Ball: von unten hochschlagen, seitlich anstupsen,
  einen fallenden Ball abbremsen.
- **Klick, Tippen oder Leertaste:** Abschlag (der Ball liegt anfangs auf dem Schläger),
  auf Titel-, Gewonnen- und Verloren-Bildschirm: neues Spiel.
- **Pfeiltasten / WASD:** Schläger per Tastatur steuern.
- **P:** Pause.

Der Ball fällt mit leichter Schwerkraft. Unten ist das Feld offen: Fällt der Ball heraus,
kostet das ein Leben (Anzeige „KEYS“). Man startet mit 5 Leben.

### Blöcke

| Block | Aussehen | Wirkung |
|---|---|---|
| Chip | Neonrahmen mit Hash-Fragment | ein Treffer, 10 Punkte |
| verschlüsselt | Schloss und drei Balken | drei Treffer, bekommt Glitch-Risse, 30 Punkte |
| Firewall | grau schraffiert | unzerstörbar |
| Schlüssel | Schlüsselsymbol | nur mit dem Schläger zerstörbar, 50 Punkte |
| Schwerkraft | Doppelpfeil | kehrt die Schwerkraft für 8 Sekunden um, 20 Punkte |
| Malware | rotes Warnzeichen | nicht berühren: Ball oder Schläger daran kostet ein Leben |

Ein Level ist geschafft, wenn alle zerstörbaren Blöcke weg sind. Es gibt vier Level.

Direkt in ein Level springen: `index.html?level=3`.

## Entwicklung

- `src/game.js` ist die Quelle des Spiels, `src/tests.js` enthält die Selbsttests.
- `index.html` wird erzeugt: `python3 src/assemble.py` (Windows: `py -3 src/assemble.py`).
  Nie von Hand ändern.
- Tests: `index.html?test=1` setzt den Seitentitel auf `PASS` oder `FAIL`, das Protokoll
  steht unten links. Headless: `sh src/runtests.sh /pfad/zu/chrome-headless-shell`.
