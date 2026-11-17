# AGENTS.md – Hinweise für Assistenten und Agenten

## Projekt

- Browser-Spiel im Atari-ST-Look, Draufsicht-Ballspiel mit frei beweglichem Schläger.
- Spieltitel im Spiel ist der Platzhalter `Prellblock` (Konstante `TITLE` in `src/game.js`).
  Den Namen des historischen Vorbilds nicht als Spieltitel verwenden.
- **Nur Spielidee und Stil übernehmen.** Keinen Original-Code, keine Original-Grafiken,
  keine Original-Level nachbauen, keine fremden Assets (Bilder, Schriften, Sounds).
- **Kein Ton.** Der Nutzer mag keinen Ton; keine Audio-Ausgabe einbauen.
- Look: 320×200 logische Pixel, ganzzahlig skaliert, `image-rendering: pixelated`,
  kräftige Palette, eigene 3×5-Pixelschrift, GEM-artige Menüleiste und Dialoge.

## Dateien

- `src/game.js` ist die einzige Quelle für das Spiel.
- `src/tests.js` enthält `runTests()` für `?test=1`; wird vor `game.js` eingebunden.
- `index.html` wird mit `python3 src/assemble.py` (Windows: `py -3 src/assemble.py`) erzeugt – nie von Hand ändern.
- `src/runtests.sh [chrome-headless-shell]` baut und prüft headless.

## Spielmechanik (Stand der ersten Version)

- Feste Zeitschritte von 1/60 s (`DT`), je vier Unterschritte (`SUB`) gegen Tunneln. Nicht zurückbauen.
- Schläger folgt der Maus mit begrenzter Geschwindigkeit (`PAD_MAX`), Tastatur mit `PAD_KEY`.
  Schläger wird von Wänden und Steinen blockiert; Kristalle zerbrechen bei Kontakt.
- Impuls: Abprall relativ zur Schlägergeschwindigkeit (`E_PAD`), seitliche Mitnahme (`PAD_TANGENT`),
  Mindestabprall nach oben (`MIN_UP`). Klemmt der Ball an der Wand, weicht der Schläger aus.
- Ball: leichte Schwerkraft (`GRAVITY`), Tempolimit `BALL_MAX`, unten offen.
- Steinarten im Level-Code: `R G Y B M O` normal, `H` hart (3 Treffer), `S` Stahl, `K` Kristall
  (nur Schläger), `V` Schwerkraft-Umkehr (`GRAV_FLIP_TIME`), `X` Totenkopf (kostet ein Leben,
  danach Schonzeit `SAFE_TIME`).
- Level sind 20 Spalten breit; jeder zerstörbare Stein muss von unten erreichbar sein (Test).

## Tests

- `index.html?test=1` setzt `document.title` auf PASS oder FAIL, das Log steht in `#testlog`.
- Headless-Chrome (`chrome-headless-shell`) mit frischem `--user-data-dir` und `--virtual-time-budget=25000`.
- Physik immer auch mit ungleichen Frame-Zeiten prüfen; der Test vergleicht gleichmäßige und ungleichmäßige Frames.
- Der Bot-Test muss in jedem Level mindestens die Hälfte der Steine abräumen; neue Level so bauen, dass er das schafft.

## Git

- Commits in logischen Einheiten, deutsche Commit-Messages als UTF-8 ohne BOM, kein amend, kein force-push.
- Identität: `Juniormind1 <juniormind@proton.me>`. Vor jedem Commit nach Geheimnissen suchen.
- Erst pushen, wenn der Test TITLE PASS zeigt **und** der Nutzer den Push ausdrücklich freigegeben hat.
