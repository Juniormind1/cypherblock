// Selbsttests: index.html?test=1 setzt document.title auf PASS oder FAIL.
// Wird vor game.js eingebunden; runTests() wird von boot() aufgerufen.
function runTests() {
  const lines = [];
  const check = (name, ok, info) => lines.push((ok ? "PASS " : "FAIL ") + name + (info ? "  [" + info + "]" : ""));
  const steps = (n) => { for (let i = 0; i < n; i++) step(); };
  const resetInput = () => { input.keys = {}; input.launch = false; input.mouse = false; };
  // Testfeld: eigene Steine, Schlaeger und Ball an fester Stelle.
  const arena = (map, ball, pad) => {
    newGame(0);
    G.bricks = makeBricks(map || []);
    G.lives = START_LIVES; G.score = 0; G.safeT = 0;
    if (pad) { G.pad.x = pad.x; G.pad.y = pad.y; }
    resetInput();
    input.mouse = true; input.mx = G.pad.x + PAD_W / 2; input.my = G.pad.y + PAD_H / 2;
    if (ball) Object.assign(G.ball, { stuck: false, vx: 0, vy: 0 }, ball);
    return G.ball;
  };
  const brickAt = (c, r) => G.bricks.find((b) => b.col === c && b.row === r);
  const f = (v) => v.toFixed(1);

  try {
    // --- Daten ---
    check("Schrift: jedes Zeichen hat 3x5 Pixel", Object.values(FONT).every((g) => g.length === 15 && /^[#.]+$/.test(g)));
    check("Level: alle Zeilen 20 Spalten, nur bekannte Steine", LEVELS.every((l) => l.map.every((row) => row.length === COLS && /^[.RGYBMOHSKVX]+$/.test(row))));
    check("Level: jedes Level hat abraeumbare Steine", LEVELS.every((l) => makeBricks(l.map).some((b) => isDestructible(b.t))));
    check("Level: mindestens drei Level", LEVELS.length >= 3);
    check("Level: Steine liegen im Spielfeld", LEVELS.every((l) => makeBricks(l.map).every((b) => b.x >= 0 && b.x + b.w <= W && b.y >= TOP + 8 && b.y + b.h <= H - 40)));
    // Erreichbarkeit: von unten durch freie Felder; abgeraeumte Steine werden frei.
    const rowsTotal = Math.floor((H - ROW0) / BRICK_H);
    const reachable = LEVELS.map((l) => {
      const grid = [];
      for (let r = -1; r < rowsTotal; r++) { const row = []; for (let c = 0; c < COLS; c++) row.push(r < 0 ? "." : (l.map[r] ? l.map[r][c] : ".")); grid.push(row); }
      let changed = true;
      while (changed) {
        changed = false;
        const seen = grid.map((row) => row.map(() => false));
        const q = [];
        for (let c = 0; c < COLS; c++) if (grid[grid.length - 1][c] === ".") { seen[grid.length - 1][c] = true; q.push([grid.length - 1, c]); }
        while (q.length) {
          const [r, c] = q.pop();
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const rr = r + dr, cc = c + dc;
            if (rr < 0 || rr >= grid.length || cc < 0 || cc >= COLS || seen[rr][cc]) continue;
            const t = grid[rr][cc];
            if (t === ".") { seen[rr][cc] = true; q.push([rr, cc]); }
            else if (isDestructible(t)) { grid[rr][cc] = "."; changed = true; }
          }
        }
      }
      return grid.every((row) => row.every((t) => !isDestructible(t)));
    });
    check("Level: alle abraeumbaren Steine sind erreichbar", reachable.every(Boolean), reachable.join(","));

    // --- Spielablauf ---
    newGame(0); resetInput();
    check("Neues Spiel: Level 1, 5 Leben, Ball liegt auf dem Schlaeger", G.mode === "play" && G.level === 0 && G.lives === 5 && G.ball.stuck);
    steps(10);
    check("Ball bleibt bis zum Abschlag auf dem Schlaeger", G.ball.stuck && Math.abs(G.ball.x - (G.pad.x + PAD_W / 2)) < 0.01);
    input.launch = true; step();
    check("Abschlag: Ball fliegt nach oben", !G.ball.stuck && G.ball.vy < -100, "vy=" + f(G.ball.vy));

    let b = arena([], { x: 160, y: 60 });
    steps(30);
    check("Schwerkraft: Ball faellt mit ca. 120 px/s^2", Math.abs(b.vy - GRAVITY * 0.5) < 2, "vy=" + f(b.vy));

    b = arena([], { x: 10, y: 60, vx: -200 }, { x: 140, y: 184 });
    steps(10);
    check("Wand: Ball prallt gedaempft ab", b.vx > 150 && b.vx < 200, "vx=" + f(b.vx));
    b = arena([], { x: 160, y: 30, vy: -200 }, { x: 140, y: 184 });
    steps(10);
    check("Decke: Ball prallt nach unten ab", b.vy > 0 && b.y >= TOP + BALL_R);

    // Normaler Stein von unten
    b = arena(["....................", "..........R........."], { x: 168, y: ROW0 + 30, vy: -200 }, { x: 140, y: 184 });
    steps(20);
    check("Normaler Stein: ein Treffer raeumt ab, +10 Punkte", !brickAt(10, 1).alive && G.score === 10 && b.vy > 0, "score=" + G.score);

    // Harter Stein: 3 Treffer
    b = arena(["....................", "..........H........."], {}, { x: 140, y: 184 });
    const hard = brickAt(10, 1);
    const hits = [];
    for (let k = 0; k < 3; k++) { Object.assign(b, { x: 168, y: ROW0 + 30, vx: 0, vy: -200 }); steps(20); hits.push(hard.alive); }
    check("Harter Stein: haelt zwei Treffer, der dritte raeumt ab", hits[0] && hits[1] && !hits[2] && G.score === 40, hits.join(",") + " score=" + G.score);

    // Stahl
    b = arena(["....................", "..........S........."], {}, { x: 140, y: 184 });
    for (let k = 0; k < 5; k++) { Object.assign(b, { x: 168, y: ROW0 + 30, vx: 0, vy: -200 }); steps(20); }
    check("Stahl: bleibt nach fuenf Treffern stehen", brickAt(10, 1).alive && G.score === 0);

    // Kristall: Ball nein, Schlaeger ja
    b = arena(["....................", "..........K........."], { x: 168, y: ROW0 + 30, vy: -200 }, { x: 140, y: 184 });
    steps(20);
    const crystalAfterBall = brickAt(10, 1).alive;
    check("Kristall: Ball prallt ab, Kristall bleibt", crystalAfterBall && b.vy > 0);
    arena(["....................", "..........K........."], { x: 20, y: 150 }, { x: 144, y: 120 });
    input.mx = 168; input.my = ROW0 + 12;
    steps(30);
    check("Kristall: Schlaeger zerstoert ihn, +50 Punkte", !brickAt(10, 1).alive && G.score === 50, "score=" + G.score);

    // Schwerkraft-Stein
    b = arena(["R...................", "..........V........."], { x: 168, y: ROW0 + 30, vy: -200 }, { x: 140, y: 184 });
    steps(20);
    check("Schwerkraft-Stein: kehrt die Schwerkraft um", !brickAt(10, 1).alive && G.grav === -1);
    Object.assign(b, { x: 60, y: 120, vx: 0, vy: 0 });
    steps(10);
    check("Schwerkraft umgekehrt: Ball steigt", b.vy < -15, "vy=" + f(b.vy));
    steps(Math.round(GRAV_FLIP_TIME * 60));
    check("Schwerkraft normal nach 8 s", G.grav === 1);

    // Totenkopf
    b = arena(["....................", "..........X........."], { x: 168, y: ROW0 + 30, vy: -200 }, { x: 140, y: 184 });
    steps(20);
    check("Totenkopf: Ballkontakt kostet ein Leben", G.lives === START_LIVES - 1 && G.ball.stuck && G.safeT > 0);
    arena(["....................", "..........X........."], { x: 20, y: 150 }, { x: 144, y: 120 });
    input.mx = 168; input.my = ROW0 + 12;
    steps(30);
    check("Totenkopf: Schlaegerkontakt kostet ein Leben", G.lives === START_LIVES - 1, "lives=" + G.lives);
    steps(60);
    check("Totenkopf: Schonzeit verhindert sofortigen zweiten Verlust", G.lives >= START_LIVES - 2, "lives=" + G.lives);
    check("Totenkopf: Schlaeger dringt nicht ein", !overlap(G.pad, brickAt(10, 1)));

    // Ball unten raus
    b = arena([], { x: 20, y: 190, vy: 100 }, { x: 140, y: 184 });
    steps(10);
    check("Ball unten raus: ein Leben weniger", G.lives === START_LIVES - 1 && G.ball.stuck);
    for (let k = 0; k < START_LIVES - 1; k++) { Object.assign(G.ball, { stuck: false, x: 20, y: 190, vx: 0, vy: 100 }); steps(10); }
    check("Kein Leben mehr: Verloren-Bildschirm", G.mode === "lost" && G.lives === 0);

    // Level geschafft, naechstes Level, Gewonnen
    b = arena(["....................", "..........R........."], { x: 168, y: ROW0 + 30, vy: -200 }, { x: 140, y: 184 });
    steps(20);
    check("Letzter Stein: Level geschafft", G.mode === "clear");
    steps(Math.ceil(CLEAR_TIME * 60) + 1);
    check("Nach der Pause: Level 2 beginnt", G.mode === "play" && G.level === 1 && G.ball.stuck && G.score === 10);
    loadLevel(LEVELS.length - 1);
    G.bricks = makeBricks(["....................", "..........R........."]);
    Object.assign(G.ball, { stuck: false, x: 168, y: ROW0 + 30, vx: 0, vy: -200 });
    steps(20 + Math.ceil(CLEAR_TIME * 60) + 1);
    check("Letztes Level geschafft: Gewonnen-Bildschirm", G.mode === "won");
    check("Stahl und Totenkopf zaehlen nicht als Reststeine", (() => { G.bricks = makeBricks(["SX.R"+"................"]); return remaining() === 1; })());

    // --- Schlaeger und Impuls ---
    const hitFrom = (padVy) => {
      const bb = arena([], { x: 160, y: 150, vy: 80 }, { x: 144, y: 160 });
      input.mx = 160; input.my = 160 + PAD_H / 2 + (padVy ? -60 : 0);
      let minVy = 0;
      for (let i = 0; i < 12; i++) { step(); minVy = Math.min(minVy, bb.vy); }
      return minVy;
    };
    const vStill = hitFrom(0), vUp = hitFrom(1);
    check("Impuls: Schlag nach oben macht den Ball schneller", vUp < vStill - 60, "still=" + f(vStill) + " hoch=" + f(vUp));
    check("Mindestabprall vom ruhenden Schlaeger", vStill <= -MIN_UP + 1, "vy=" + f(vStill));

    b = arena([], { x: 180, y: 100 }, { x: 130, y: 96 });
    G.grav = 0;
    input.mx = 220; input.my = 99;
    steps(8);
    G.grav = 1;
    check("Impuls: seitliches Anstupsen schiebt den Ball weg", b.vx > 150, "vx=" + f(b.vx));

    b = arena([], { x: 160, y: 120, vy: 150 }, { x: 144, y: 180 });
    input.mx = 160; input.my = 110;
    steps(20);
    check("Abbremsen: Schlaeger faengt einen fallenden Ball ab", b.vy < 0 && b.y < 180, "vy=" + f(b.vy) + " y=" + f(b.y));

    b = arena([], { x: 4, y: 100 }, { x: 40, y: 97 });
    G.grav = 0;
    input.mx = -50; input.my = 100;
    steps(30);
    G.grav = 1;
    check("Eingeklemmter Ball bleibt im Feld", b.x >= BALL_R - 0.01 && G.pad.x >= 0 && !circleRect(b, G.pad), "bx=" + f(b.x) + " px=" + f(G.pad.x));

    arena(["....................", "....................", "SSSSSSSSSSSSSSSSSSSS"], { x: 20, y: 150 }, { x: 144, y: 120 });
    input.mx = 160; input.my = 10;
    steps(30);
    check("Schlaeger kommt nicht durch Stahl", G.pad.y >= ROW0 + 3 * BRICK_H - 0.01, "y=" + f(G.pad.y));
    input.mx = 9999; input.my = 9999; steps(30);
    check("Schlaeger bleibt im Feld", G.pad.x === W - PAD_W && G.pad.y === H - PAD_H);

    arena([], { x: 20, y: 150 }, { x: 144, y: 160 });
    input.mouse = false; input.keys.ArrowLeft = true; input.keys.ArrowUp = true;
    steps(30);
    check("Tastatur: Pfeile bewegen den Schlaeger", Math.abs(G.pad.x - (144 - PAD_KEY * 0.5)) < 1 && Math.abs(G.pad.y - (160 - PAD_KEY * 0.5)) < 1, f(G.pad.x) + "/" + f(G.pad.y));
    input.keys = {};

    // Kein Tunneln bei Hoechstgeschwindigkeit
    b = arena(["....................", "..........R........."], { x: 168, y: ROW0 + 40, vy: -BALL_MAX }, { x: 140, y: 184 });
    G.grav = 0; steps(10); G.grav = 1;
    check("Kein Tunneln bei Hoechstgeschwindigkeit", !brickAt(10, 1).alive && b.y > ROW0 + 2 * BRICK_H);
    b = arena([], { x: 160, y: 60, vx: 900, vy: -900 }, { x: 140, y: 184 });
    step();
    check("Geschwindigkeit wird begrenzt", Math.hypot(b.vx, b.vy) <= BALL_MAX + 1e-6);

    // Feste Zeitschritte: ungleiche Frames ergeben denselben Zustand
    const runFrames = (frames) => {
      arena(LEVELS[0].map, { x: 100, y: 150, vx: 90, vy: -170 }, { x: 144, y: 184 });
      acc = 0;
      for (const fr of frames) advance(fr);
      return [G.ball.x, G.ball.y, G.ball.vx, G.ball.vy, G.score, G.steps].map((v) => v.toFixed(6)).join(",");
    };
    const even = [], uneven = [];
    for (let i = 0; i < 90; i++) even.push(1 / 60);
    for (let i = 0; i < 30; i++) uneven.push(1 / 60 * 0.5, 1 / 60 * 1.75, 1 / 60 * 0.75);
    const sEven = runFrames(even), sUneven = runFrames(uneven);
    check("Feste 1/60-s-Schritte: ungleiche Frames, gleicher Zustand", sEven === sUneven, sEven + " | " + sUneven);
    check("Ball ist in diesem Vergleich noch im Flug", sEven.indexOf(",90.000000") > 0 && !G.ball.stuck);
    acc = 0;
    const before = G.steps;
    advance(5);
    check("Lange Frames werden gedeckelt (max. 0,25 s)", G.steps - before === 15, String(G.steps - before));

    // Langlauf mit Zufallsbewegungen: Ball verlaesst das Feld nur nach unten
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let escaped = false;
    for (let lv = 0; lv < LEVELS.length; lv++) {
      newGame(lv); resetInput(); input.mouse = true;
      for (let i = 0; i < 1800; i++) {
        if (G.mode !== "play") break;
        if (i % 20 === 0) { input.mx = rnd() * W; input.my = 60 + rnd() * 140; }
        if (G.ball.stuck) input.launch = true;
        step();
        const bb = G.ball;
        if (bb.x < BALL_R - 0.01 || bb.x > W - BALL_R + 0.01 || bb.y < TOP + BALL_R - 0.01 || !isFinite(bb.x + bb.y)) escaped = true;
        if (G.pad.x < 0 || G.pad.x > W - PAD_W || G.pad.y < TOP || G.pad.y > H - PAD_H) escaped = true;
      }
    }
    check("Langlauf: Ball und Schlaeger bleiben im Feld", !escaped);

    // Einfacher Bot spielt jedes Level: abraeumen muss moeglich sein
    const botPlay = (lv, maxSec) => {
      newGame(lv); resetInput(); input.mouse = true;
      G.lives = 99;
      const start = remaining();
      let off = 0, aim = W / 2;
      for (let i = 0; i < maxSec * 60 && G.mode === "play"; i++) {
        const bb = G.ball;
        if (bb.stuck) input.launch = true;
        if (i % 20 === 0) {
          // Ziel: tiefster Stein; Spalte darunter frei waehlen, seitlich mitziehen gibt Richtung
          const alive = G.bricks.filter((x) => x.alive);
          const tg = alive.filter((x) => isDestructible(x.t) && x.t !== "K").sort((a, c) => c.y - a.y || Math.abs(a.x - bb.x) - Math.abs(c.x - bb.x))[0];
          if (tg) {
            let best = null;
            for (let c = 0; c < COLS; c++) {
              const blocked = alive.some((x) => x.col === c && x.row > tg.row);
              if (!blocked && (best === null || Math.abs(c - tg.col) < Math.abs(best - tg.col))) best = c;
            }
            aim = (best === null ? tg.col : best) * BRICK_W + BRICK_W / 2;
          }
          off = clamp((aim - bb.x) / 60, -1, 1) + (rnd() - 0.5) * 0.3;
        }
        const crystal = G.bricks.find((x) => x.alive && x.t === "K");
        if (crystal && i % 600 > 480 && bb.vy < 0) { input.mx = crystal.x + 8; input.my = crystal.y + crystal.h + 6; }
        else if (bb.vy * G.grav > 0 && bb.y > 150) { input.mx = bb.x + off * 40; input.my = bb.y; }   // entgegen schlagen
        else { input.mx = bb.x - off * 8; input.my = 188; }                                          // unten warten
        step();
      }
      return { left: remaining(), start, mode: G.mode, lost: 99 - G.lives };
    };
    const botRes = LEVELS.map((_, lv) => botPlay(lv, 360));
    const botInfo = botRes.map((r, i) => "L" + (i + 1) + ":" + (r.start - r.left) + "/" + r.start + (r.mode !== "play" ? "*" : "") + " -" + r.lost).join(" ");
    check("Bot: raeumt in jedem Level mindestens die Haelfte ab", botRes.every((r) => r.start - r.left >= r.start / 2), botInfo);
    lines.push("INFO bot " + botInfo);
  } catch (err) {
    lines.push("FAIL Ausnahme " + (err && err.stack ? err.stack : err));
  }
  const fail = lines.some((l) => l.startsWith("FAIL"));
  const log = document.getElementById("testlog");
  log.style.display = "block";
  log.textContent = lines.filter((l) => !l.startsWith("PASS")).length + " Hinweise, " + lines.filter((l) => l.startsWith("PASS")).length + " bestanden\n" + lines.join("\n");
  document.title = fail ? "FAIL" : "PASS";
  // Zurueck auf den Titelbildschirm
  G.mode = "title"; G.grav = 1;
}
