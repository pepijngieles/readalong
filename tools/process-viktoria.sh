#!/usr/bin/env bash
# Verwerk de Wikimedia-audio van Viktoria av Hessen-Darmstadt.
# Vereist: export XI_API_KEY=...  (optioneel: export DEEPL_API_KEY=...)
set -euo pipefail
cd "$(dirname "$0")/.."

AUDIO="tools/cache/No-VIKTORIA_AV_HESSEN-DARMSTADT.ogg"
SCRIPT="tools/viktoria-av-hessen-darmstadt-script.txt"
CACHE="tools/cache/viktoria-scribe.json"

python3 tools/readalong.py from-audio \
  --audio "$AUDIO" \
  --script "$SCRIPT" \
  --slug viktoria-av-hessen-darmstadt \
  --heading "Viktoria av Hessen-Darmstadt" \
  --voice-id vemund \
  --voice-name "Vemund Vikjord" \
  --language no \
  --translations en,nl \
  --title-en "Victoria of Hesse-Darmstadt" \
  --title-nl "Victoria van Hessen-Darmstadt" \
  --level B2-C1 \
  --source-title "Viktoria av Hessen-Darmstadt (Wikipedia)" \
  --source-author "Vemund Vikjord (innlest); tekst: Wikipedia-bidragsytere" \
  --source-url "https://no.wikipedia.org/wiki/Viktoria_av_Hessen-Darmstadt" \
  --rights-text-source "Wikipedia (no)" \
  --rights-audio-recorded "2013-04-05" \
  --rights-audio-url "https://commons.wikimedia.org/wiki/File:No-VIKTORIA_AV_HESSEN-DARMSTADT.ogg" \
  --source-license "CC BY-SA 4.0 (audio en tekst)" \
  --source-note "Audio: https://commons.wikimedia.org/wiki/File:No-VIKTORIA_AV_HESSEN-DARMSTADT.ogg" \
  --cache "$CACHE" \
  "$@"

python3 tools/readalong.py check
