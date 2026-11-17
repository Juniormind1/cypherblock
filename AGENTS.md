# AGENTS.md – Hinweise für Assistenten und Agenten

## Projekt

- Browser-Spiel: Draufsicht-Ballspiel mit frei beweglichem Schläger. **Nur die Spielmechanik**
  ist an das historische Vorbild angelehnt, der optische Stil ist **Cypherpunk** (Nutzerwunsch).
- Spieltitel im Spiel ist der Platzhalter `CIPHERBLOCK` (Konstante `TITLE` in `src/game.js`).
  Den Namen des historischen Vorbilds nicht als Spieltitel verwenden.
- **Nur Spielidee übernehmen.** Keinen Original-Code, keine Original-Grafiken,
  keine Original-Level nachbauen, keine fremden Assets (Bilder, Schriften, Sounds).
- **Kein Ton.** Der Nutzer mag keinen Ton; keine Audio-Ausgabe einbauen.

## Grafik: Vektor und auflösungsunabhängig (Nutzerwunsch)

- **Keine Pixelgrafik, keine Bitmaps, keine Pixelschrift.** Alles wird als Canvas-Pfad gezeichnet,
  Text mit einem Monospace-Systemfont (`MONO`).
- Spielwelt in logischen Einheiten 320×200 (`W`, `H`). `layout()` skaliert sie auf die Canvas-Größe
  mal `devicePixelRatio`, Seitenverhältnis bleibt, Rest ist schwarze Letterbox. `draw()` setzt die
  Transformation, `render()` zeichnet nur in Weltkoordinaten.
- Glow über `shadowBlur` immer mit `glow()` setzen; das skaliert mit der Auflösung (`VIEW.k`).
- Resize, Orientierungswechsel und DPR-Wechsel werden jeden Frame übernommen.
- Stil: dunkler Grund, Neon-Grün/Cyan/Magenta, Terminal-Typo, Raster mit Hex-/Binärfetzen,
  Statuszeile und Terminal-Fenster statt Dialogen. Blöcke: Chips mit Hash-Fragment, Schloss
  (verschlüsselt), Firewall, Schlüssel, Schwerkraft-Doppelpfeil, Malware-Warnzeichen.

## Steuerung

- Maus, Stift und Touch über Pointer Events (`onPointer`). Bei Touch sitzt der Schläger
  `TOUCH_LIFT` über dem Finger. Klick/Tippen/Leertaste = Start bzw. Abschlag.
- Während des Spiels kein Scrollen, Zoomen oder Doppeltipp-Zoom (Touch-Events und Gesten blockiert,
  `touch-action: none`).
- Tastatur: Pfeile/WASD, P = Pause.

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
- Steinarten im Level-Code: `R G Y B M O` normal (Chip), `H` hart/verschlüsselt (3 Treffer),
  `S` Stahl/Firewall, `K` Kristall/Schlüssel (nur Schläger), `V` Schwerkraft-Umkehr
  (`GRAV_FLIP_TIME`), `X` Totenkopf/Malware (kostet ein Leben, danach Schonzeit `SAFE_TIME`).
- Level sind 20 Spalten breit; jeder zerstörbare Stein muss von unten erreichbar sein (Test).

## Tests

- `index.html?test=1` setzt `document.title` auf PASS oder FAIL, das Log steht in `#testlog`.
- Headless-Chrome (`chrome-headless-shell`) mit frischem `--user-data-dir` und `--virtual-time-budget=25000`.
- Physik immer auch mit ungleichen Frame-Zeiten prüfen; der Test vergleicht gleichmäßige und ungleichmäßige Frames.
- Darstellung wird in mehreren Größen und DPR getestet (Layout, Welt/Bildschirm-Umrechnung, Rendern
  aller Bildschirme, Pixel-Stichproben); Zeiger und Touch über synthetische Pointer Events.
- Der Bot-Test muss in jedem Level mindestens die Hälfte der Steine abräumen; neue Level so bauen, dass er das schafft.

## Git

- Commits in logischen Einheiten, deutsche Commit-Messages als UTF-8 ohne BOM, kein amend, kein force-push.
- Identität: `Juniormind1 <juniormind@proton.me>`. Vor jedem Commit nach Geheimnissen suchen.
- Erst pushen, wenn der Test TITLE PASS zeigt **und** der Nutzer den Push ausdrücklich freigegeben hat.
