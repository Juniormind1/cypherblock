# bolo-style

Atari ST inspired – ein kleines Ballspiel für den Browser im Look der Atari-ST-Zeit.
Arbeitstitel im Spiel: **Prellblock** (Platzhalter).

Inspiriert von der Spielidee der Breakout-Varianten der späten 80er mit frei beweglichem
Schläger. Alles ist eigene Umsetzung: eigener Code, eigene Pixelgrafik, eigene Level,
keine fremden Assets. Es gibt keinen Ton.

## Spielen

`index.html` im Browser öffnen. Es wird nichts nachgeladen, alles steckt in der einen Datei.

- **Maus:** Der Schläger folgt der Maus frei über das Spielfeld (waagerecht und senkrecht).
  Die Bewegung des Schlägers überträgt sich auf den Ball: von unten hochschlagen,
  seitlich anstupsen, einen fallenden Ball abbremsen.
- **Klick oder Leertaste:** Abschlag (der Ball liegt anfangs auf dem Schläger), auf
  den Titel-, Gewonnen- und Verloren-Bildschirmen: neues Spiel.
- **Pfeiltasten / WASD:** Schläger per Tastatur steuern.
- **P:** Pause.

Der Ball fällt mit leichter Schwerkraft. Unten ist das Feld offen: Fällt der Ball heraus,
kostet das ein Leben. Man startet mit 5 Leben.

### Steine

| Stein | Wirkung |
|---|---|
| bunt | ein Treffer, 10 Punkte |
| braun (hart) | drei Treffer, bekommt Risse, 30 Punkte |
| grau (Stahl) | unzerstörbar |
| türkis (Kristall) | nur mit dem Schläger zerstörbar, 50 Punkte |
| lila mit Pfeil | kehrt die Schwerkraft für 8 Sekunden um, 20 Punkte |
| Totenkopf | nicht berühren: Ball oder Schläger daran kostet ein Leben |

Ein Level ist geschafft, wenn alle zerstörbaren Steine weg sind. Es gibt vier Level.

Direkt in ein Level springen: `index.html?level=3`.

## Entwicklung

- `src/game.js` ist die Quelle des Spiels, `src/tests.js` enthält die Selbsttests.
- `index.html` wird erzeugt: `python3 src/assemble.py` (Windows: `py -3 src/assemble.py`).
  Nie von Hand ändern.
- Tests: `index.html?test=1` setzt den Seitentitel auf `PASS` oder `FAIL`, das Protokoll
  steht unten links. Headless: `sh src/runtests.sh /pfad/zu/chrome-headless-shell`.
