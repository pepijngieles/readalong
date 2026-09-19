#!/usr/bin/env bash
# Verwerk Verzameld Nederlands (LibriVox) voor Readalong.
# Vereist: export XI_API_KEY=...  (geen DEEPL — vertalingen vult de agent in)
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"
EXTRA=()
if [[ -n "$SLUG" ]]; then
  EXTRA=("$SLUG")
fi

python3 tools/fetch_nl_librivox.py "${EXTRA[@]}"

process_one() {
  local slug="$1"
  local cache="tools/cache/nl/${slug}-scribe.json"
  local audio="tools/cache/nl/${slug}.mp3"
  if [[ ! -f "$audio" ]]; then
    echo "Geen audio cache voor $slug — eerst fetch_nl_librivox.py" >&2
    return 1
  fi

  local duration
  duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$audio")"

  # Metadata uit fetch_nl_librivox.py (duplicatie beperkt tot shell-lus)
  python3 - "$slug" "$cache" "$duration" <<'PY'
import importlib.util
import json, subprocess, sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("fnl", "tools/fetch_nl_librivox.py")
fnl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fnl)
STORIES = fnl.STORIES

slug, cache, duration = sys.argv[1:4]
story = next(s for s in STORIES if s["slug"] == slug)
duration = float(duration)

args = [
    "python3", "tools/readalong.py", "from-audio",
    "--audio", f"tools/cache/nl/{slug}.mp3",
]
if not story.get("no_script"):
    args += ["--script", f"tools/cache/nl/{slug}.txt"]
args += [
    "--slug", slug,
    "--heading", story["heading"],
    "--voice-id", story["voice_id"],
    "--voice-name", story["voice_name"],
    "--language", "nl",
    "--translations", "en",
    "--title-en", story["title_en"],
    "--level", story["level"],
    "--kind", story["kind"],
    "--order", str(story["order"]),
    "--attribution-title", story["attribution_title"],
    "--attribution-url", story["attribution_url"],
    "--rights-text-source", story["rights_text_source"],
    "--rights-text-license", story["rights_text_license"],
    "--rights-text-url", story["rights_text_url"],
    "--rights-audio-reader", story["rights_audio_reader"],
    "--rights-audio-license", story["rights_audio_license"],
    "--rights-audio-url", story["rights_audio_url"],
    "--max-duration", str(duration - 2),
    "--cache", cache,
    "--publish",
]
if story.get("allow_intro"):
    args.append("--allow-intro")

subprocess.run(args, check=True)

meta_path = Path("stories") / slug / "story.json"
meta = json.loads(meta_path.read_text(encoding="utf-8"))
meta["topic"] = story["topic"]
meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"  topic: {story['topic']}")
PY
}

run_all() {
  for slug in \
    rontgenstralen-lorentz \
    gezondheid-en-ziekte-eijkman \
    tien-uren-op-jacht \
    een-misdaad \
    de-laatste-eer-aan-een-overledene \
    mijnheer-prikkebeen \
    krakatau-en-de-straat-soenda \
    fabriekskinderen \
    van-dagen-en-seizoenen \
    de-brave-hendrik \
    het-krabbetje-en-de-gerechtigheid \
    zedelijke-opvoeding
  do
    process_one "$slug"
  done
}

if [[ -n "$SLUG" ]]; then
  process_one "$SLUG"
else
  run_all
fi
