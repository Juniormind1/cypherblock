// Cipherblock – Draufsicht-Ballspiel mit frei beweglichem Schlaeger, Cypherpunk-Optik.
// Eigene Umsetzung einer Spielidee, keine Original-Assets. Kein Ton.
"use strict";

const TITLE = "CIPHERBLOCK";
const W = 320, H = 200;            // Spielwelt in logischen Einheiten (unabhaengig von der Bildschirmaufloesung)
const TOP = 12;                    // Hoehe der Statuszeile
const DT = 1 / 60;                 // fester Zeitschritt
const SUB = 4;                     // Unterschritte pro Zeitschritt (kein Tunneln)
const GRAVITY = 120;               // px/s^2, leichte Schwerkraft
const BALL_R = 3;
const BALL_MAX = 320;              // px/s
const SERVE_SPEED = 170;           // Abschlag nach oben
const PAD_W = 32, PAD_H = 6;
const PAD_MAX = 720;               // px/s, Maus-Verfolgung
const PAD_KEY = 240;               // px/s, Tastatur
const E_WALL = 0.92;               // Abprall an Waenden
const E_BRICK = 0.95;              // Abprall an Steinen
const E_PAD = 0.85;                // Abprall am Schlaeger (relativ)
const PAD_TANGENT = 0.35;          // Anteil der Schlaeger-Seitwaertsbewegung, der mitgenommen wird
const MIN_UP = 100;                // Mindest-Rueckprallgeschwindigkeit nach oben vom Schlaeger
const GRAV_FLIP_TIME = 8;          // s, Schwerkraft umgekehrt
const SAFE_TIME = 1.2;             // s Schonzeit nach Ballverlust
const CLEAR_TIME = 1.6;            // s Pause nach geschafftem Level
const START_LIVES = 5;
const TOUCH_LIFT = 14;             // Touch: Schlaeger sitzt so weit ueber dem Finger, damit er sichtbar bleibt
const BRICK_W = 16, BRICK_H = 8, COLS = 20, ROW0 = TOP + 16;

// Neon-Palette (Cypherpunk): dunkler Grund, Gruen/Cyan/Magenta als Akzente.
const PAL = {
  bg: "#04070a", grid: "rgba(0,229,255,0.07)", code: "rgba(57,255,20,0.10)",
  green: "#39ff14", cyan: "#00e5ff", magenta: "#ff2bd6", red: "#ff2e4d", text: "#c8ffd0", dim: "#2a6b3a",
  R: "#ff2e88", G: "#39ff14", Y: "#e8ff3a", B: "#00e5ff", M: "#c04bff", O: "#ff9f1c",
  H: "#ffd166", K: "#7df9ff", V: "#b388ff", X: "#ff2e4d", S: "#5d6b7a",
};
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';

// Steinarten
//  R G Y B M O  normal, 1 Treffer
//  H  hart, 3 Treffer
//  S  Stahl, unzerstoerbar
//  K  Kristall, nur mit dem Schlaeger zerstoerbar
//  V  Schwerkraft, kehrt die Schwerkraft fuer 8 s um
//  X  Totenkopf, nicht beruehren
const NORMAL = "RGYBMO";
function isDestructible(t) { return NORMAL.includes(t) || t === "H" || t === "K" || t === "V"; }

const LEVELS = [
  { name: "AUFWAERMEN", map: [
    "..RRRRRRRRRRRRRRRR..",
    "..YYYYYYYYYYYYYYYY..",
    "..GGGGGGGGGGGGGGGG..",
    "..BBBBBBBBBBBBBBBB..",
  ] },
  { name: "STAHLTOR", map: [
    "....................",
    "...MMMMMMMMMMMMMM...",
    "...HHHHHVVHHHHHHH...",
    "...MMMMMMMMMMMMMM...",
    "....................",
    "SSS..............SSS",
  ] },
  { name: "KRISTALL", map: [
    "OOOOOOOOOOOOOOOOOOOO",
    "O.X..............X.O",
    "OOOOOOOOOOOOOOOOOOOO",
    "....................",
    "X..................X",
    "...KK....KK....KK...",
    "....................",
    "SS................SS",
  ] },
  { name: "FINALE", map: [
    "HHHHHHHHHHHHHHHHHHHH",
    "R.R.R.R.R.R.R.R.R.R.",
    ".Y.Y.Y.Y.V.Y.Y.Y.Y.Y",
    "....................",
    "SS....X......X....SS",
    "....................",
    "......KKKKKKKK......",
  ] },
];

const G = {
  mode: "title", level: 0, lives: START_LIVES, score: 0,
  bricks: [], ball: null, pad: null, grav: 1, gravT: 0, safeT: 0, timer: 0, steps: 0,
};
const input = { mx: W / 2, my: H - 20, mouse: false, touch: false, keys: {}, launch: false };

function makeBricks(map) {
  const out = [];
  map.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const t = row[c];
      if (!t || t === ".") continue;
      out.push({ t, x: c * BRICK_W, y: ROW0 + r * BRICK_H, w: BRICK_W, h: BRICK_H, hp: t === "H" ? 3 : 1, alive: true, col: c, row: r });
    }
  });
  return out;
}

function resetBall() {
  const p = G.pad;
  G.ball = { x: p.x + PAD_W / 2, y: p.y - BALL_R - 0.5, vx: 0, vy: 0, r: BALL_R, stuck: true };
  G.grav = 1; G.gravT = 0;
}

function loadLevel(i) {
  G.level = i;
  G.bricks = makeBricks(LEVELS[i].map);
  G.pad = { x: W / 2 - PAD_W / 2, y: H - 16, w: PAD_W, h: PAD_H, vx: 0, vy: 0 };
  input.mx = W / 2; input.my = H - 16 + PAD_H / 2;
  resetBall();
  G.safeT = 0;
  G.mode = "play";
}

function newGame(level) {
  G.lives = START_LIVES; G.score = 0; G.steps = 0;
  loadLevel(level || 0);
}

function remaining() { return G.bricks.filter((b) => b.alive && isDestructible(b.t)).length; }

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// Kreis gegen Rechteck: Normale (vom Rechteck zum Ball) und Eindringtiefe oder null.
function circleRect(ball, r) {
  const cx = clamp(ball.x, r.x, r.x + r.w), cy = clamp(ball.y, r.y, r.y + r.h);
  let dx = ball.x - cx, dy = ball.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= ball.r * ball.r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, pen: ball.r - d };
  }
  // Mittelpunkt im Rechteck: kuerzeste Achse nach aussen
  const l = ball.x - r.x, rr = r.x + r.w - ball.x, t = ball.y - r.y, bb = r.y + r.h - ball.y;
  const m = Math.min(l, rr, t, bb);
  if (m === l) return { nx: -1, ny: 0, pen: l + ball.r };
  if (m === rr) return { nx: 1, ny: 0, pen: rr + ball.r };
  if (m === t) return { nx: 0, ny: -1, pen: t + ball.r };
  return { nx: 0, ny: 1, pen: bb + ball.r };
}

function reflect(b, n, e, uvx, uvy) {
  const rvx = b.vx - uvx, rvy = b.vy - uvy;
  const vn = rvx * n.nx + rvy * n.ny;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * n.nx;
    b.vy -= (1 + e) * vn * n.ny;
  }
}

function destroy(b, pts) {
  b.alive = false;
  G.score += pts;
  if (remaining() === 0 && G.mode === "play") { G.mode = "clear"; G.timer = CLEAR_TIME; }
}

// Ein Stein wird getroffen; byPad = vom Schlaeger beruehrt.
function hitBrick(b, byPad) {
  const t = b.t;
  if (t === "X") { if (G.safeT <= 0) loseBall(); return; }
  if (t === "S") return;
  if (t === "K") { if (byPad) destroy(b, 50); return; }
  if (t === "H") { b.hp--; if (b.hp <= 0) destroy(b, 30); else G.score += 5; return; }
  if (t === "V") { G.grav = -1; G.gravT = GRAV_FLIP_TIME; destroy(b, 20); return; }
  destroy(b, 10);
}

function loseBall() {
  G.lives--;
  if (G.lives <= 0) { G.lives = 0; G.mode = "lost"; return; }
  resetBall();
  G.safeT = SAFE_TIME;
}

// Schlaeger um (dx,dy) verschieben, achsenweise, Waende und Steine blockieren.
function movePad(dx, dy) {
  const p = G.pad;
  const tryAxis = (ax, d) => {
    if (!d) return 0;
    const old = p[ax];
    p[ax] += d;
    p.x = clamp(p.x, 0, W - p.w);
    p.y = clamp(p.y, TOP, H - p.h);
    for (const b of G.bricks) {
      if (!b.alive || !overlap(p, b)) continue;
      if (b.t === "K") { destroy(b, 50); continue; }
      if (b.t === "X" && G.safeT <= 0 && G.mode === "play") { p[ax] = old; loseBall(); return 0; }
      p[ax] = old;                       // blockiert
      return 0;
    }
    return p[ax] - old;
  };
  return { mx: tryAxis("x", dx), my: tryAxis("y", dy) };
}

function substep(h, pdx, pdy) {
  const p = G.pad, b = G.ball;
  const moved = movePad(pdx, pdy);
  if (G.mode !== "play") return;
  const pvx = moved.mx / h, pvy = moved.my / h;
  if (b.stuck) { b.x = p.x + p.w / 2; b.y = p.y - b.r - 0.5; return; }
  b.vy += GRAVITY * G.grav * h;
  b.x += b.vx * h; b.y += b.vy * h;
  // Steine: tiefsten Kontakt aufloesen
  let best = null, bestB = null;
  for (const br of G.bricks) {
    if (!br.alive) continue;
    const c = circleRect(b, br);
    if (c && (!best || c.pen > best.pen)) { best = c; bestB = br; }
  }
  if (best) {
    b.x += best.nx * best.pen; b.y += best.ny * best.pen;
    reflect(b, best, E_BRICK, 0, 0);
    hitBrick(bestB, false);
    if (G.mode !== "play" || b.stuck) return;
  }
  // Schlaeger mit Impulsuebertragung
  const c = circleRect(b, p);
  if (c) {
    b.x += c.nx * c.pen; b.y += c.ny * c.pen;
    reflect(b, c, E_PAD, pvx, pvy);
    // Seitwaerts mitnehmen (Tangente)
    const tx = -c.ny, ty = c.nx;
    const vt = b.vx * tx + b.vy * ty, pt = pvx * tx + pvy * ty;
    const dv = (pt - vt) * PAD_TANGENT;
    b.vx += dv * tx; b.vy += dv * ty;
    if (c.ny < -0.5 && b.vy > -MIN_UP) b.vy = -MIN_UP;
  }
  // Waende (unten offen)
  if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * E_WALL; }
  if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * E_WALL; }
  if (b.y < TOP + b.r) { b.y = TOP + b.r; b.vy = Math.abs(b.vy) * E_WALL; }
  // Klemmt der Ball zwischen Schlaeger und Wand, weicht der Schlaeger aus.
  const c2 = circleRect(b, p);
  if (c2) { p.x = clamp(p.x - c2.nx * c2.pen, 0, W - p.w); p.y = clamp(p.y - c2.ny * c2.pen, TOP, H - p.h); }
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > BALL_MAX) { b.vx *= BALL_MAX / sp; b.vy *= BALL_MAX / sp; }
  if (b.y - b.r > H) loseBall();
}

// Ein fester Spielschritt von 1/60 s.
function step() {
  G.steps++;
  if (G.mode === "clear") {
    G.timer -= DT;
    if (G.timer <= 0) { if (G.level + 1 < LEVELS.length) loadLevel(G.level + 1); else G.mode = "won"; }
    return;
  }
  if (G.mode !== "play") return;
  const p = G.pad;
  let tx, ty;
  const kx = (input.keys.ArrowRight || input.keys.KeyD ? 1 : 0) - (input.keys.ArrowLeft || input.keys.KeyA ? 1 : 0);
  const ky = (input.keys.ArrowDown || input.keys.KeyS ? 1 : 0) - (input.keys.ArrowUp || input.keys.KeyW ? 1 : 0);
  if (kx || ky) input.mouse = false;
  if (input.mouse) { tx = input.mx - p.w / 2; ty = input.my - p.h / 2; }
  else { tx = p.x + kx * PAD_KEY * DT; ty = p.y + ky * PAD_KEY * DT; }
  const dx = clamp(tx - p.x, -PAD_MAX * DT, PAD_MAX * DT);
  const dy = clamp(ty - p.y, -PAD_MAX * DT, PAD_MAX * DT);
  const x0 = p.x, y0 = p.y;
  for (let i = 0; i < SUB && G.mode === "play"; i++) substep(DT / SUB, dx / SUB, dy / SUB);
  p.vx = (p.x - x0) / DT; p.vy = (p.y - y0) / DT;
  if (G.mode !== "play") return;
  if (input.launch && G.ball.stuck) {
    G.ball.stuck = false;
    G.ball.vx = p.vx * 0.3;
    G.ball.vy = -SERVE_SPEED + Math.min(0, p.vy * 0.3);
  }
  input.launch = false;
  if (G.gravT > 0) { G.gravT -= DT; if (G.gravT <= 0) { G.gravT = 0; G.grav = 1; } }
  if (G.safeT > 0) G.safeT = Math.max(0, G.safeT - DT);
}

// Echtzeit in feste Schritte zerlegen.
let acc = 0;
function advance(sec) {
  acc += Math.min(sec, 0.25);
  let n = 0;
  while (acc >= DT - 1e-9) { step(); acc -= DT; n++; }
  return n;
}

// ---------- Grafik (Vektor, aufloesungsunabhaengig) ----------
// Alles wird in Weltkoordinaten (W x H) als Pfad gezeichnet; die Ansicht skaliert
// das auf die tatsaechliche Canvas-Groesse mal devicePixelRatio (Letterbox).

const VIEW = { cssW: W, cssH: H, dpr: 1, s: 1, ox: 0, oy: 0, k: 1 };

// Groesse der Anzeige berechnen: Seitenverhaeltnis bleibt, Rest wird schwarz.
function layout(cssW, cssH, dpr) {
  const s = Math.min(cssW / W, cssH / H);
  return { cssW, cssH, dpr, s, ox: (cssW - W * s) / 2, oy: (cssH - H * s) / 2, k: s * dpr };
}
function worldToScreen(v, x, y) { return { x: v.ox + x * v.s, y: v.oy + y * v.s }; }
function screenToWorld(v, x, y) { return { x: (x - v.ox) / v.s, y: (y - v.oy) / v.s }; }

function glow(ctx, col, blur) { ctx.shadowColor = col; ctx.shadowBlur = blur * VIEW.k; }
function noGlow(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; }
function font(ctx, size, weight) { ctx.font = (weight || "600") + " " + size + "px " + MONO; }
function text(ctx, str, x, y, col, size, align, weight) {
  font(ctx, size, weight); ctx.fillStyle = col; ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
}
function hexTag(b) {
  let h = Math.imul((b.col + 1) * 73856093 ^ (b.row + 1) * 19349663, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 4);
}

// Hintergrund: Raster, Hash- und Binaerfetzen (fest, nicht zufaellig pro Frame).
const CODE_BITS = (() => {
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out = [];
  for (let i = 0; i < 26; i++) {
    const bin = rnd() < 0.5;
    let t = "";
    for (let k = 0; k < 8; k++) t += bin ? (rnd() < 0.5 ? "0" : "1") : "0123456789abcdef"[Math.floor(rnd() * 16)];
    out.push({ x: rnd() * (W - 30) + 4, y: TOP + 8 + rnd() * (H - TOP - 14), t: (bin ? "" : "0x") + t });
  }
  return out;
})();

function background(ctx) {
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = PAL.grid; ctx.lineWidth = 0.25;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 10) { ctx.moveTo(x, TOP); ctx.lineTo(x, H); }
  for (let y = TOP; y <= H; y += 10) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  for (const c of CODE_BITS) text(ctx, c.t, c.x, c.y, PAL.code, 4, "left", "400");
}

function statusBar(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, W, TOP);
  glow(ctx, PAL.green, 3);
  ctx.strokeStyle = PAL.green; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(0, TOP - 0.2); ctx.lineTo(W, TOP - 0.2); ctx.stroke();
  noGlow(ctx);
  text(ctx, "> " + TITLE, 4, TOP / 2, PAL.green, 5.5, "left", "700");
  if (G.mode !== "title") {
    text(ctx, "LVL " + (G.level + 1), 92, TOP / 2, PAL.cyan, 5.5);
    text(ctx, "SCORE " + String(G.score).padStart(6, "0"), 140, TOP / 2, PAL.text, 5.5);
    text(ctx, "KEYS", 232, TOP / 2, PAL.text, 5.5);
    for (let i = 0; i < G.lives; i++) { ctx.fillStyle = PAL.magenta; ctx.beginPath(); ctx.arc(256 + i * 6, TOP / 2, 1.6, 0, Math.PI * 2); ctx.fill(); }
    if (G.grav < 0) text(ctx, "G-1", W - 4, TOP / 2, PAL.V, 5.5, "right", "700");
  }
}

// Symbole (alle im Brick-Rahmen 16 x 8 zentriert um cx, cy)
function iconLock(ctx, cx, cy, col) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(cx, cy - 0.8, 1.6, Math.PI, 0); ctx.stroke();
  ctx.fillRect(cx - 2.2, cy - 0.8, 4.4, 3.2);
}
function iconKey(ctx, cx, cy, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(cx - 2.5, cy, 1.5, 0, Math.PI * 2);
  ctx.moveTo(cx - 1, cy); ctx.lineTo(cx + 4, cy); ctx.moveTo(cx + 2.5, cy); ctx.lineTo(cx + 2.5, cy + 1.5); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 4, cy + 1.5);
  ctx.stroke();
}
function iconGravity(ctx, cx, cy, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 1); ctx.lineTo(cx - 1.5, cy - 2.8); ctx.lineTo(cx, cy - 1); ctx.moveTo(cx - 1.5, cy - 2.8); ctx.lineTo(cx - 1.5, cy + 2.8);
  ctx.moveTo(cx, cy + 1); ctx.lineTo(cx + 1.5, cy + 2.8); ctx.lineTo(cx + 3, cy + 1); ctx.moveTo(cx + 1.5, cy + 2.8); ctx.lineTo(cx + 1.5, cy - 2.8);
  ctx.stroke();
}
function iconWarn(ctx, cx, cy, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(cx, cy - 3.2); ctx.lineTo(cx + 3.6, cy + 2.8); ctx.lineTo(cx - 3.6, cy + 2.8); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = col; ctx.fillRect(cx - 0.35, cy - 1.4, 0.7, 2.4); ctx.beginPath(); ctx.arc(cx, cy + 1.9, 0.4, 0, Math.PI * 2); ctx.fill();
}

function drawBrick(ctx, b) {
  const x = b.x + 0.6, y = b.y + 0.6, w = b.w - 1.2, h = b.h - 1.2, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const col = PAL[b.t] || PAL.cyan;
  if (b.t === "S") {               // Firewall: schraffiert, kein Glow
    rrect(ctx, x, y, w, h, 0.8); ctx.fillStyle = "#11161c"; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = alpha(col, 0.7); ctx.lineWidth = 0.4; ctx.beginPath();
    for (let i = -8; i < 18; i += 2.2) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); }
    ctx.stroke(); ctx.restore();
    rrect(ctx, x, y, w, h, 0.8); ctx.strokeStyle = col; ctx.lineWidth = 0.5; ctx.stroke();
    return;
  }
  if (b.t === "X") {               // Malware: rot, Warnsymbol, pulsiert nicht (ruhig lesbar)
    rrect(ctx, x, y, w, h, 0.8); ctx.fillStyle = "rgba(255,46,77,0.16)"; ctx.fill();
    glow(ctx, col, 3); ctx.strokeStyle = col; ctx.lineWidth = 0.5; ctx.setLineDash([1.2, 0.8]); ctx.stroke(); ctx.setLineDash([]);
    iconWarn(ctx, cx, cy, col); noGlow(ctx);
    return;
  }
  // Chip-Block: dunkle Fuellung, Neonrahmen, Kontaktbeinchen
  rrect(ctx, x, y, w, h, 1); ctx.fillStyle = alpha(col, 0.14); ctx.fill();
  glow(ctx, col, 2.5); ctx.strokeStyle = col; ctx.lineWidth = 0.55; ctx.stroke(); noGlow(ctx);
  ctx.strokeStyle = alpha(col, 0.55); ctx.lineWidth = 0.35; ctx.beginPath();
  for (let i = 3; i < b.w - 2; i += 3) { ctx.moveTo(b.x + i, b.y); ctx.lineTo(b.x + i, b.y + 0.9); ctx.moveTo(b.x + i, b.y + b.h - 0.9); ctx.lineTo(b.x + i, b.y + b.h); }
  ctx.stroke();
  if (b.t === "H") {               // verschluesselter Block: Schloss und Haltbarkeit
    iconLock(ctx, cx - 3.5, cy, col);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < b.hp ? col : alpha(col, 0.2); ctx.fillRect(cx + 0.5 + i * 2.2, cy - 1.2, 1.5, 2.4); }
    if (b.hp < 3) {                // Glitch-Risse
      ctx.strokeStyle = PAL.magenta; ctx.lineWidth = 0.4; ctx.beginPath();
      ctx.moveTo(x + 2, y + 1); ctx.lineTo(x + 4, y + 3.5); ctx.lineTo(x + 3, y + h - 1);
      if (b.hp < 2) { ctx.moveTo(x + w - 2, y + 0.8); ctx.lineTo(x + w - 4.5, y + 3); ctx.lineTo(x + w - 3, y + h - 0.8); }
      ctx.stroke();
    }
    return;
  }
  if (b.t === "K") { glow(ctx, col, 3); iconKey(ctx, cx, cy, col); noGlow(ctx); return; }
  if (b.t === "V") { glow(ctx, col, 3); iconGravity(ctx, cx, cy, col); noGlow(ctx); return; }
  text(ctx, hexTag(b), cx, cy + 0.2, col, 4, "center", "700");
}

function drawPad(ctx, p) {
  rrect(ctx, p.x, p.y, p.w, p.h, 1.5); ctx.fillStyle = "rgba(0,229,255,0.18)"; ctx.fill();
  glow(ctx, PAL.cyan, 4); ctx.strokeStyle = PAL.cyan; ctx.lineWidth = 0.7; ctx.stroke(); noGlow(ctx);
  ctx.strokeStyle = PAL.magenta; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(p.x + 5, p.y + p.h / 2); ctx.lineTo(p.x + p.w - 5, p.y + p.h / 2); ctx.stroke();
}

function drawBall(ctx, b) {
  glow(ctx, PAL.green, 5);
  ctx.fillStyle = PAL.green; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = "#eaffea"; ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.35, 0, Math.PI * 2); ctx.fill();
}

// Terminal-Fenster statt Dialogbox
function terminal(ctx, title, lines, y0) {
  const w = 220, lh = 9, h = lines.length * lh + 20, x = (W - w) / 2, y = y0 !== undefined ? y0 : (H - h) / 2;
  rrect(ctx, x, y, w, h, 2); ctx.fillStyle = "rgba(2,8,6,0.92)"; ctx.fill();
  glow(ctx, PAL.green, 5); ctx.strokeStyle = PAL.green; ctx.lineWidth = 0.6; ctx.stroke(); noGlow(ctx);
  ctx.strokeStyle = alpha(PAL.green, 0.5); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x + w, y + 9); ctx.stroke();
  text(ctx, "[ " + title + " ]", x + 5, y + 4.8, PAL.green, 4.5, "left", "700");
  [PAL.red, PAL.Y, PAL.green].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + w - 6 - i * 4.5, y + 4.6, 1.3, 0, Math.PI * 2); ctx.fill(); });
  lines.forEach((l, i) => text(ctx, l[0], W / 2, y + 16 + i * lh, l[1] || PAL.text, 5, "center", l[2] || "600"));
}

function titleScreen(ctx) {
  const ty = 42;
  font(ctx, 26, "800"); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = alpha(PAL.magenta, 0.8); ctx.fillText(TITLE, W / 2 - 1.2, ty + 0.6);
  ctx.fillStyle = alpha(PAL.cyan, 0.8); ctx.fillText(TITLE, W / 2 + 1.2, ty - 0.6);
  glow(ctx, PAL.green, 6); ctx.fillStyle = PAL.green; ctx.fillText(TITLE, W / 2, ty); noGlow(ctx);
  text(ctx, "break the blocks // trust no one", W / 2, ty + 17, PAL.dim, 5.5, "center", "600");
  const demo = ["RGYBMO", "HSKVX"];
  demo.forEach((row, r) => [...row].forEach((t, c) => drawBrick(ctx, { t, x: W / 2 - row.length * 9 + c * 18 + 1, y: 70 + r * 11, w: 16, h: 8, hp: 3, col: c, row: r })));
  terminal(ctx, "README.TXT", [
    ["MAUS / FINGER: SCHLAEGER FREI BEWEGEN"],
    ["SCHWUNG GEHT AUF DEN BALL UEBER"],
    ["KLICK, TIPPEN, LEERTASTE: ABSCHLAG"],
    ["PFEILE / WASD: TASTATUR   P: PAUSE"],
    ["SCHLUESSEL NUR MIT DEM SCHLAEGER", PAL.K],
    ["MALWARE NICHT BERUEHREN", PAL.red],
    ["> KLICKEN ODER TIPPEN ZUM START_", PAL.green, "700"],
  ], 100);
}

// Zeichnet eine Szene in Weltkoordinaten; der Aufrufer setzt die Transformation.
function render(ctx) {
  background(ctx);
  statusBar(ctx);
  if (G.mode === "title") { titleScreen(ctx); return; }
  for (const b of G.bricks) if (b.alive) drawBrick(ctx, b);
  const p = G.pad;
  const blink = G.safeT > 0 && Math.floor(G.safeT * 10) % 2 === 0;
  if (!blink) drawPad(ctx, p);
  if (G.ball) drawBall(ctx, G.ball);
  if (G.mode === "play" && G.ball && G.ball.stuck) text(ctx, "> " + LEVELS[G.level].name + " :: ABSCHLAG MIT KLICK ODER TIPPEN", W / 2, 150, PAL.text, 5, "center");
  if (G.paused) terminal(ctx, "PAUSE", [["PROZESS ANGEHALTEN"], ["P ZUM FORTSETZEN"]]);
  if (G.mode === "clear") terminal(ctx, "OK", [["LEVEL ENTSCHLUESSELT", PAL.green, "700"], [LEVELS[G.level].name]]);
  if (G.mode === "won") terminal(ctx, "ACCESS GRANTED", [["GEWONNEN!", PAL.green, "700"], ["SCORE " + G.score], ["KLICKEN ODER TIPPEN: NEUES SPIEL"]]);
  if (G.mode === "lost") terminal(ctx, "CONNECTION LOST", [["VERLOREN", PAL.red, "700"], ["SCORE " + G.score], ["KLICKEN ODER TIPPEN: NEUES SPIEL"]]);
}

// Ganze Canvas zeichnen: Letterbox schwarz, Welt skaliert und beschnitten.
function draw(ctx, v) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(v.k, 0, 0, v.k, v.ox * v.dpr, v.oy * v.dpr);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  render(ctx);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Hochformat: Hinweis im freien Bereich unter dem Spielfeld
  if (v.oy > 70) {
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    font(ctx, 13, "600"); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = PAL.dim;
    ctx.fillText("// tipp: geraet quer halten", v.cssW / 2, v.oy + H * v.s + Math.min(40, v.oy / 2));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

// ---------- Einbindung in die Seite ----------
const params = new URLSearchParams(location.search);
const TEST = params.get("test") === "1";
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");

// Canvas an Fenstergroesse und devicePixelRatio anpassen.
function resize() {
  const cssW = Math.max(1, canvas.clientWidth || innerWidth), cssH = Math.max(1, canvas.clientHeight || innerHeight);
  const dpr = Math.min(4, Math.max(1, window.devicePixelRatio || 1));
  Object.assign(VIEW, layout(cssW, cssH, dpr));
  const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
}

// Bildschirmpunkt (clientX/Y) in Weltkoordinaten, auf das Spielfeld begrenzt.
function pointerToWorld(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const p = screenToWorld(VIEW, clientX - r.left, clientY - r.top);
  return { x: clamp(p.x, 0, W), y: clamp(p.y, 0, H) };
}

function primary() {
  if (G.mode === "title" || G.mode === "won" || G.mode === "lost") { newGame(0); return; }
  if (G.mode === "play") input.launch = true;
}

// Maus, Stift und Finger ueber Pointer Events. Bei Touch sitzt der Schlaeger ueber dem Finger.
function onPointer(e, down) {
  const p = pointerToWorld(e.clientX, e.clientY);
  input.touch = e.pointerType === "touch";
  input.mx = p.x;
  input.my = input.touch ? clamp(p.y - TOUCH_LIFT, 0, H) : p.y;
  input.mouse = true;
  if (down) {
    if (canvas.setPointerCapture && e.pointerId !== undefined) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetischer Pointer */ } }
    primary();
  }
  if (e.cancelable) e.preventDefault();
}

function boot() {
  resize();
  addEventListener("resize", resize);
  addEventListener("orientationchange", resize);
  if (window.visualViewport) visualViewport.addEventListener("resize", resize);
  canvas.addEventListener("pointermove", (e) => onPointer(e, false));
  canvas.addEventListener("pointerdown", (e) => onPointer(e, true));
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  // Kein Scrollen, Zoomen oder Doppeltipp-Zoom waehrend des Spiels
  const block = (e) => { if (e.cancelable) e.preventDefault(); };
  for (const t of ["touchstart", "touchmove", "gesturestart", "gesturechange", "dblclick"]) document.addEventListener(t, block, { passive: false });
  addEventListener("keydown", (e) => {
    input.keys[e.code] = true;
    if (e.code === "Space" || e.code === "Enter") { primary(); e.preventDefault(); }
    if (e.code === "KeyP" && G.mode === "play") G.paused = !G.paused;
    if (e.code.startsWith("Arrow")) e.preventDefault();
  });
  addEventListener("keyup", (e) => { input.keys[e.code] = false; });
  const lv = parseInt(params.get("level"), 10);
  if (lv >= 1 && lv <= LEVELS.length) newGame(lv - 1);
  if (TEST) { if (typeof runTests === "function") runTests(); else document.title = "FAIL"; resize(); draw(ctx, VIEW); return; }
  let last = performance.now();
  const frame = (now) => {
    const sec = (now - last) / 1000; last = now;
    if (!G.paused) advance(sec);
    resize();
    draw(ctx, VIEW);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
