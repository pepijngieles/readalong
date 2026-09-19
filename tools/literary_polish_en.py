#!/usr/bin/env python3
"""Polish tools/cache/nl/<slug>-en.json for literary Readalong EN."""
import argparse
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

GLOSSARY = [
    (r"\bMr\. Prickleg\b", "Mr Prikkebeen"),
    (r"\bPriek\b", "Prikkebeen"),
    (r"\bSpikeleg\b", "Prikkebeen"),
    (r"\bPrikkebeen\b", "Prikkebeen"),
    (r"\bUrso\b", "Urso"),
    (r"\bKrakatau\b", "Krakatoa"),
    (r"\bStraat Soenda\b", "Sunda Strait"),
    (r"\bBatavia\b", "Batavia"),
    (r"\bJava\b", "Java"),
    (r"\bLibrivox Org\b", "LibriVox.org"),
    (r"\bLibrivox\b", "LibriVox"),
    (r"\bGouverneur\b", "Goeverneur"),
    (r"\bX-rays\b", "X-rays"),
    (r"\bRöntgen\b", "Röntgen"),
]

ARCHAIC = [
    (r"\bshall ye hear\b", "you shall hear"),
    (r"\bshall ye\b", "you shall"),
    (r"\b ye \b", " you "),
    (r"\bYe \b", "You "),
    (r"\bthou\b", "you"),
    (r"\bthee\b", "you"),
    (r"\bthy\b", "your"),
]

FIXES = [
    (r"\bchapel catch\b", "butterfly catching"),
    (r"\bkapellen\b", "butterflies"),
    (r"\bFucking bone\b", "Prikkebeen"),
    (r"\bPrickleg\b", "Prikkebeen"),
    (r"\bmatt in the evening\b", "weary in the evening"),
    (r"\bginkles\b", "grins"),
    (r"\bforbade\b", "forbidden that"),
    (r"\bPriek\b", "Prikkebeen"),
    (r"\s+", " "),
]


def polish(text: str) -> str:
    t = str(text).strip()
    for pat, repl in GLOSSARY + ARCHAIC + FIXES:
        t = re.sub(pat, repl, t, flags=re.I)
    return t.strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    args = parser.parse_args()
    path = REPO / "tools" / "cache" / "nl" / f"{args.slug}-en.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    sentences = [polish(s) for s in doc.get("sentences") or []]
    doc["sentences"] = sentences
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{args.slug}: polished {len(sentences)} sentences")


if __name__ == "__main__":
    main()
