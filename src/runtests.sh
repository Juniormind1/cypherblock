#!/bin/sh
# Baut index.html und fuehrt ?test=1 headless aus. Aufruf: sh src/runtests.sh [chrome-headless-shell]
set -e
cd "$(dirname "$0")/.."
CH="${1:-${CHROME_HEADLESS:-chrome-headless-shell}}"
python3 src/assemble.py >/dev/null
D="$(mktemp -d)"
"$CH" --no-sandbox --user-data-dir="$D" --virtual-time-budget=25000 --dump-dom "file://$PWD/index.html?test=1" 2>/dev/null > "$D/out.html"
python3 - "$D/out.html" <<'PY'
import re, sys, html
t = open(sys.argv[1], encoding="utf-8", errors="replace").read()
m = re.search(r'id="testlog"[^>]*>(.*?)</pre>', t, re.S)
print(html.unescape(m.group(1)) if m else "NO LOG")
tm = re.search(r"<title>(.*?)</title>", t)
print("TITLE", tm.group(1) if tm else "none")
PY
rm -rf "$D"
