#!/usr/bin/env python3
"""Schrijf lege EN-vertalingen in stories/<slug>/translations/en.json.

Gebruik: agent leest NL-segmenten en vult ``translations`` in (geen DeepL).
Dit script past een JSON-bestand met dezelfde lengte als het aantal zinnen toe.

  python3 tools/agent_translate_story.py --slug het-krabbetje-en-de-gerechtigheid \\
      --from-file tools/cache/nl/het-krabbetje-en-de-gerechtigheid-en.json
"""

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def flatten(blocks):
    out = []
    for block in blocks:
        out.extend(block.get("sentences") or [])
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--from-file", required=True, help="JSON: {title?, sentences: [...]}")
    args = parser.parse_args()

    story_dir = REPO / "stories" / args.slug
    meta = json.loads((story_dir / "story.json").read_text(encoding="utf-8"))
    lang = meta["language"]
    text = json.loads((story_dir / "text" / f"{lang}.json").read_text(encoding="utf-8"))
    count = len(flatten(text["blocks"]))

    incoming = json.loads(Path(args.from_file).read_text(encoding="utf-8"))
    sentences = incoming.get("sentences") or incoming
    if len(sentences) != count:
        sys.exit(f"{len(sentences)} vertalingen voor {count} brontalen zinnen")

    en_path = story_dir / "translations" / "en.json"
    doc = json.loads(en_path.read_text(encoding="utf-8")) if en_path.exists() else {}
    if incoming.get("title"):
        doc["title"] = incoming["title"]
    doc["sentences"] = sentences
    en_path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    empty = sum(1 for s in sentences if not str(s).strip())
    print(f"{args.slug}: {count} zinnen, {empty} leeg")


if __name__ == "__main__":
    main()
