#!/usr/bin/env bash
set -euo pipefail

VERSION=$(grep -oE '"version"\s*:\s*"[^"]+"' manifest.json | head -1 | sed -E 's/.*"([^"]+)"$/\1/')
OUT="dist/orbit-${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"

INCLUDE=(
  manifest.json
  newtab.html
  app.js
  background.js
  media-content.js
  style.css
  icons
  vendor
)

for p in "${INCLUDE[@]}"; do
  [[ -e "$p" ]] || { echo "Missing required path: $p" >&2; exit 1; }
done

zip -r "$OUT" "${INCLUDE[@]}" >/dev/null
echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
