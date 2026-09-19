#!/usr/bin/env python3
"""Merge literary segment overrides into tools/cache/nl/<slug>-en.json."""
import argparse
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--override", action="append", default=[], help="JSON file: {index: text}")
    args = parser.parse_args()

    cache = REPO / "tools" / "cache" / "nl" / f"{args.slug}-en.json"
    doc = json.loads(cache.read_text(encoding="utf-8"))
    sentences = list(doc.get("sentences") or [])

    for path in args.override:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        for key, text in data.items():
            idx = int(key)
            if 0 <= idx < len(sentences):
                sentences[idx] = text

    doc["sentences"] = sentences
    cache.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    empty = sum(1 for s in sentences if not str(s).strip())
    print(f"{args.slug}: {len(sentences)} sentences, {empty} empty after overrides")


if __name__ == "__main__":
    main()
