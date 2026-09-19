#!/usr/bin/env python3
"""Build tools/cache/nl/<slug>-en.json via MyMemory (no API keys). Resumes partial files."""
import argparse
import json
import sys
import time
from pathlib import Path

from deep_translator import MyMemoryTranslator

REPO = Path(__file__).resolve().parent.parent


def flatten(blocks):
    out = []
    for block in blocks:
        out.extend(block.get("sentences") or [])
    return out


def translate_one(translator, text: str, retries=5) -> str:
    if not str(text).strip():
        return text
    chunk = text
    for attempt in range(retries):
        try:
            return translator.translate(chunk)
        except Exception as exc:
            wait = min(30, 2 ** attempt)
            print(f"  retry {attempt + 1}: {exc}", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"failed after {retries}: {text[:80]!r}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--delay", type=float, default=0.12)
    parser.add_argument("--start", type=int, default=0, help="resume index")
    args = parser.parse_args()

    nl_path = REPO / "stories" / args.slug / "text" / "nl.json"
    source = flatten(json.loads(nl_path.read_text(encoding="utf-8"))["blocks"])
    cache_dir = REPO / "tools" / "cache" / "nl"
    cache_dir.mkdir(parents=True, exist_ok=True)
    out_path = cache_dir / f"{args.slug}-en.json"

    existing = []
    if out_path.exists() and args.start == 0:
        doc = json.loads(out_path.read_text(encoding="utf-8"))
        existing = doc.get("sentences") or []
        if len(existing) == len(source) and all(str(s).strip() for s in existing):
            print(f"{args.slug}: cache complete ({len(existing)} sentences)")
            return
        if existing and len(existing) <= len(source):
            args.start = next(
                (i for i, s in enumerate(existing) if not str(s).strip()),
                len(existing),
            )
            print(f"resume at {args.start}", file=sys.stderr)

    sentences = list(existing) if existing else []
    while len(sentences) < len(source):
        sentences.append("")

    translator = MyMemoryTranslator(source="dutch", target="english")
    for i in range(args.start, len(source)):
        if str(sentences[i]).strip():
            continue
        sentences[i] = translate_one(translator, source[i])
        if i % 25 == 0 or i == len(source) - 1:
            out_path.write_text(
                json.dumps({"title": args.title, "sentences": sentences}, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"{i + 1}/{len(source)}", flush=True)
        time.sleep(args.delay)

    out_path.write_text(
        json.dumps({"title": args.title, "sentences": sentences}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    empty = sum(1 for s in sentences if not str(s).strip())
    print(f"{args.slug}: {len(sentences)} sentences, {empty} empty")


if __name__ == "__main__":
    main()
