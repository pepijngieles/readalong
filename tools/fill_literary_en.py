#!/usr/bin/env python3
"""Fill tools/cache/nl/<slug>-en.json with literary EN (MyMemory + glossary polish)."""
import argparse
import json
import re
import sys
import time
from pathlib import Path

from deep_translator import MyMemoryTranslator

REPO = Path(__file__).resolve().parent.parent

GLOSSARY = [
    (r"\bX-rays\b", "X-rays"),
    (r"\bX rays\b", "X-rays"),
    (r"\bX-ray\b", "X-ray"),
    (r"\bRöntgen\b", "Röntgen"),
    (r"\bRoentgen\b", "Röntgen"),
    (r"\bDe Gids\b", "De Gids"),
    (r"\belectricity\b", "electricity"),
    (r"\belectrische\b", "electric"),
    (r"\bfluorescence\b", "fluorescence"),
    (r"\bfluorescent\b", "fluorescent"),
    (r"\bhygiene\b", "hygiene"),
    (r"\bberiberi\b", "beriberi"),
]

DUTCH_HINT = re.compile(
    r"\b(van de|van het|een |het |zijn |zou |niet |ook |maar |door |voor |waar|zoo|eene|der |den |des )\b",
    re.I,
)


def flatten(blocks):
    out = []
    for block in blocks:
        out.extend(block.get("sentences") or [])
    return out


def polish(text: str) -> str:
    t = text.strip()
    for pat, repl in GLOSSARY:
        t = re.sub(pat, repl, t, flags=re.I)
    t = re.sub(r"\s+", " ", t)
    return t


def needs_translation(en: str, nl: str) -> bool:
    if not str(en).strip():
        return True
    if en.strip() == nl.strip():
        return True
    if DUTCH_HINT.search(en):
        return True
    return False


def translate_one(translator, text: str, retries=6) -> str:
    if not str(text).strip():
        return text
    for attempt in range(retries):
        try:
            return polish(translator.translate(text))
        except Exception as exc:
            wait = min(30, 2 ** attempt)
            print(f"  retry {attempt + 1}: {exc}", file=sys.stderr, flush=True)
            time.sleep(wait)
    return text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--delay", type=float, default=0.22)
    args = parser.parse_args()

    nl_path = REPO / "stories" / args.slug / "text" / "nl.json"
    source = flatten(json.loads(nl_path.read_text(encoding="utf-8"))["blocks"])
    cache_dir = REPO / "tools" / "cache" / "nl"
    cache_dir.mkdir(parents=True, exist_ok=True)
    out_path = cache_dir / f"{args.slug}-en.json"

    sentences = [""] * len(source)
    title = args.title
    if out_path.exists():
        doc = json.loads(out_path.read_text(encoding="utf-8"))
        title = doc.get("title") or title
        existing = doc.get("sentences") or []
        for i, s in enumerate(existing):
            if i < len(sentences):
                sentences[i] = s

    translator = MyMemoryTranslator(source="dutch", target="english")
    for i, nl in enumerate(source):
        if not needs_translation(sentences[i], nl):
            sentences[i] = polish(sentences[i])
            continue
        sentences[i] = translate_one(translator, nl)
        if i % 25 == 0 or i == len(source) - 1:
            out_path.write_text(
                json.dumps({"title": title, "sentences": sentences}, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"{i + 1}/{len(source)}", flush=True)
        time.sleep(args.delay)

    out_path.write_text(
        json.dumps({"title": title, "sentences": sentences}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    empty = sum(1 for s in sentences if not str(s).strip())
    dutch = sum(1 for s in sentences if DUTCH_HINT.search(str(s)))
    print(f"{args.slug}: {len(sentences)} sentences, {empty} empty, {dutch} maybe-dutch")


if __name__ == "__main__":
    main()
