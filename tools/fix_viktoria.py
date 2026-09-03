#!/usr/bin/env python3
"""Fix Viktoria sentence splits and remap timestamps from the original alignment."""

import json
import re
from difflib import SequenceMatcher
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
STORY = REPO / "stories/viktoria-av-hessen-darmstadt"
SCRIPT = REPO / "tools/viktoria-av-hessen-darmstadt-script.txt"

MONTHS = r"(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)"


def is_header(line):
    return (len(line.split()) <= 4 and not re.search(r"[.!?:]$", line)
            and line[0].isupper() and not line.startswith("Hennes"))


def split_sentences(text):
    protected, placeholders = text, {}
    i = 0
    for m in re.finditer(rf"(?:Den\s+)?\d+\.\s+(?:{MONTHS}|marki)", text, re.I):
        key = f"__P{i}__"
        placeholders[key] = m.group(0)
        protected = protected.replace(m.group(0), key, 1)
        i += 1
    for m in re.finditer(r"\d+\.\s*–\s*\d+\.\s+juli", protected):
        key = f"__P{i}__"
        placeholders[key] = m.group(0)
        protected = protected.replace(m.group(0), key, 1)
        i += 1
    parts = re.split(r'(?<=[.!?…»"])\s+(?=[A-ZÆØÅ«"])', protected.strip())
    out = []
    for p in parts:
        for key, val in placeholders.items():
            p = p.replace(key, val)
        p = p.strip()
        if p:
            out.append(p)
    return out


def build_blocks(script_text):
    blocks = []
    for section in re.split(r"\n\s*\n", script_text.strip()):
        lines = [l.strip() for l in section.split("\n") if l.strip()]
        if len(lines) > 1 and all(
            l.startswith(("Hennes", "Lady", "Markisen", "Enkemarkisen")) for l in lines
        ):
            blocks.append({"sentences": lines})
            continue
        for line in lines:
            if is_header(line):
                blocks.append({"sentences": [line]})
            else:
                blocks.append({"sentences": split_sentences(line)})
    return blocks


def post_process(sentences):
    out = []
    i = 0
    while i < len(sentences):
        s = sentences[i]
        # Split combined early-life sentence
        if s.startswith("Viktoria blei født") and "Den 27. april" in s:
            before, after = s.split("Den 27. april", 1)
            out.append(before.strip())
            out.append("Den 27. april" + after.strip())
            i += 1
            continue
        # Merge St. Petersburg / St. Mildred's broken across lines
        if i + 1 < len(sentences) and sentences[i + 1].startswith(
            ("Petersburg", "Mildred's")
        ):
            out.append(s + " " + sentences[i + 1])
            i += 2
            continue
        # Merge Louis quote (3 parts)
        if s.startswith("I 1968 kalte han henne") and i + 5 < len(sentences):
            chunk = [s]
            j = i + 1
            while j < len(sentences) and not sentences[j].startswith("I 1906"):
                chunk.append(sentences[j])
                j += 1
            out.append(" ".join(chunk))
            i = j
            continue
        # Merge biplane quote (2 parts)
        if "biplan" in s and i + 1 < len(sentences) and sentences[i + 1].startswith("Vi satt"):
            out.append(s + " " + sentences[i + 1])
            i += 2
            continue
        # Merge Philip quote (3 parts)
        if s.startswith("Prins Philip sa en gang") and i + 2 < len(sentences):
            if "Hun behandla dem" in sentences[i + 2]:
                out.append(" ".join(sentences[i : i + 3]))
                i += 3
                continue
        # Merge grave inscription quote
        if "gravskrift" in s and i + 2 < len(sentences) and sentences[i + 2].endswith("skal.»"):
            out.append(" ".join(sentences[i : i + 3]))
            i += 3
            continue
        out.append(s)
        i += 1
    return out


def remap_timestamps(new_sents, old_sents, old_ts):
    def norm_words(s):
        return re.sub(r"[^\w]+", " ", s.lower()).split()

    new_words, new_start = [], []
    for s in new_sents:
        new_start.append(len(new_words))
        new_words.extend(norm_words(s))
    old_words, old_start = [], []
    for s in old_sents:
        old_start.append(len(old_words))
        old_words.extend(norm_words(s))

    matcher = SequenceMatcher(a=new_words, b=old_words, autojunk=False)
    mapping = {}
    for i1, j1, size in matcher.get_matching_blocks():
        for k in range(size):
            mapping[i1 + k] = j1 + k

    timestamps = []
    for start in new_start:
        ow = next((mapping.get(start + d) for d in range(30) if start + d in mapping), None)
        if ow is None:
            timestamps.append(timestamps[-1] if timestamps else 0.0)
            continue
        oi = max(i for i, s in enumerate(old_start) if s <= ow)
        timestamps.append(old_ts[oi])
    return timestamps


def blocks_from_sentences(sentences, template_blocks):
    """Keep block structure from template but replace sentence lists."""
    flat = []
    for block in template_blocks:
        n = len(block["sentences"])
        flat.append({"sentences": sentences[:n]})
        sentences = sentences[n:]
    if sentences:
        flat.append({"sentences": sentences})
    return flat


def main():
    script = SCRIPT.read_text(encoding="utf-8")
    old_text = json.loads((STORY / "text/no.json").read_text())
    meta = json.loads((STORY / "story.json").read_text())
    old_sents = [s for b in old_text["blocks"] for s in b["sentences"]]
    old_ts = meta["voices"][0]["timestamps"]

    template_blocks = build_blocks(script)
    new_sents = post_process([s for b in template_blocks for s in b["sentences"]])
    timestamps = remap_timestamps(new_sents, old_sents, old_ts)

    # Rebuild blocks using original section structure
    blocks = []
    idx = 0
    for block in template_blocks:
        n = len(block["sentences"])
        # recount after post_process - map by consuming from new_sents
        pass

    # Simpler: rebuild blocks from script structure with post-process per line batch
    blocks = []
    for section in re.split(r"\n\s*\n", script.strip()):
        lines = [l.strip() for l in section.split("\n") if l.strip()]
        if len(lines) > 1 and all(
            l.startswith(("Hennes", "Lady", "Markisen", "Enkemarkisen")) for l in lines
        ):
            blocks.append({"sentences": lines})
            continue
        for line in lines:
            if is_header(line):
                blocks.append({"sentences": [line]})
            else:
                sents = post_process(split_sentences(line))
                blocks.append({"sentences": sents})

    new_sents = [s for b in blocks for s in b["sentences"]]
    timestamps = remap_timestamps(new_sents, old_sents, old_ts)

    text = {"heading": "Viktoria av Hessen-Darmstadt", "blocks": blocks}
    (STORY / "text/no.json").write_text(
        json.dumps(text, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    meta["voices"][0]["timestamps"] = timestamps
    meta["voices"][0]["duration"] = int(round(timestamps[-1] + 5))
    meta["published"] = True
    (STORY / "story.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    export = REPO / "tools/viktoria-sentences-for-translation.json"
    export.write_text(
        json.dumps({"sentences": new_sents}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Fixed {len(new_sents)} sentences, {len(blocks)} blocks")
    print(f"Exported {export.relative_to(REPO)}")


if __name__ == "__main__":
    main()
