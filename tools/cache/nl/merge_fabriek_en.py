#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location(
    "tail", Path(__file__).resolve().parent / "_fabriekskinderen_en_tail.py"
)
tail = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tail)

path = REPO / "tools/cache/nl/fabriekskinderen-en.json"
doc = json.loads(path.read_text(encoding="utf-8"))
sentences = doc.get("sentences") or []

nl_path = REPO / "stories/fabriekskinderen/text/nl.json"
blocks = json.loads(nl_path.read_text(encoding="utf-8"))["blocks"]
source = []
for block in blocks:
    source.extend(block.get("sentences") or [])

while len(sentences) < len(source):
    sentences.append("")

for i, text in enumerate(tail.SENTENCES):
    sentences[tail.START + i] = text

# Closing date (nl segments 583–584).
sentences[583] = "The Hague, 23 Feb."
sentences[584] = "1863."

doc["title"] = "Factory children"
doc["sentences"] = sentences
path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
empty = sum(1 for s in sentences if not str(s).strip())
print(f"fabriekskinderen-en.json: {len(sentences)} sentences, {empty} empty")
