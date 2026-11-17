"""Baut index.html aus src/game.js (und src/tests.js, falls vorhanden).

index.html nie von Hand aendern, sondern immer neu bauen:
    python3 src/assemble.py      (Windows: py -3 src/assemble.py)
"""
from pathlib import Path

root = Path(__file__).resolve().parent
repo = root.parent
game = (root / "game.js").read_text(encoding="utf-8")
tests_path = root / "tests.js"
tests = tests_path.read_text(encoding="utf-8") if tests_path.exists() else ""
html = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<title>Cypherblock</title>
<style>
html, body { margin: 0; height: 100%; background: #000; overflow: hidden; touch-action: none; overscroll-behavior: none; }
canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; display: block; cursor: none; touch-action: none;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
#testlog {
  display: none; position: fixed; z-index: 3; left: 8px; bottom: 8px; max-width: 92vw; max-height: 90vh; overflow: auto;
  white-space: pre-wrap; background: rgba(255,255,255,.92); color: #222; font: 12px monospace; padding: 8px;
}
</style>
</head>
<body>
<canvas id="view"></canvas>
<pre id="testlog"></pre>
<script>
""" + tests + """
</script>
<script>
""" + game + """
</script>
</body>
</html>
"""
out = repo / "index.html"
out.write_text(html, encoding="utf-8", newline="\n")
print(out.stat().st_size)
