#!/usr/bin/env python3
"""Refine NL→EN cache to literary Readalong English (offline argos + hand tables)."""
import json
import re
from pathlib import Path

import argostranslate.translate

REPO = Path(__file__).resolve().parents[1]
CACHE = REPO / "tools" / "cache" / "nl"


def flatten(blocks):
    out = []
    for block in blocks:
        out.extend(block.get("sentences") or [])
    return out


def argos(nl: str) -> str:
    if not str(nl).strip():
        return nl
    return argostranslate.translate.translate(nl, "nl", "en")


def load_hand(name: str) -> dict[int, str]:
    path = REPO / "tools" / "literary_overrides" / name
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {int(k): v for k, v in data.items()}


def clean_garbage(en: str, nl: str) -> str:
    if re.search(r"[\u4e00-\u9fff]", en):
        en = argos(nl)
    en = en.replace("Iduration", "I, together with whom, on behalf of the Ministry of Education,")
    en = re.sub(r"\s+", " ", en).strip()
    return en


def formal_krakatoa(en: str, nl: str) -> str:
    t = clean_garbage(en, nl)
    reps = [
        (r"\bKrakatau\b", "Krakatoa"),
        (r"\bstreet of Sunda\b", "Sunda Strait"),
        (r"\bthe street Soenda\b", "the Sunda Strait"),
        (r"\bStraat Soenda\b", "Sunda Strait"),
        (r"\bMr\b", "Mr"),
        (r"\bdisplaying maritimes\b", "maritimes"),
        (r"\bJava detected\b", "Java and Sumatra were struck"),
        (r"\btransported disaster\b", "disaster"),
        (r"\bWe can be extremely distracted\b", "We may infer in some measure"),
        (r"\bgetroffen heeft,\b", "were struck,"),
        (r"\bgetroffen heeft\b", "were struck"),
        (r"\bMagazine\b", "magazine"),
        (r"\bOxus \b", "Oxus"),
        (r"\bflexibly were installed\b", "were comfortably settled"),
        (r"\bto good times\b", "smoothly"),
    ]
    for a, b in reps:
        t = re.sub(a, b, t, flags=re.I)
    if nl.strip().startswith("Produced by"):
        return "Produced by Jeroen Hellingman and the Project Gutenberg Distributed Proofreaders team."
    if nl.strip() == "KRAKATAU EN DE STRAAT SOENDA.":
        return "Krakatoa and the Sunda Strait."
    if nl.strip().startswith("De herinnering"):
        return (
            "The memory of the appalling catastrophe that in August 1883 struck the island of Krakatoa "
            "and the neighbouring coasts of Java and Sumatra"
        )
    if nl.strip().startswith("is--zoo als"):
        return "is—as always happens—effaced by the stream of later events and impressions."
    if nl.strip().startswith("Toch mogen wij"):
        return "Yet we may well suppose that it has not vanished altogether,"
    if nl.strip().startswith("of de lezers"):
        return (
            "or the readers of our periodical will peruse with interest the following account by "
            "Mr Edmond Cotteau, who, by order of the French government,"
        )
    if "wetenschappelijke zending" in nl:
        return "a scientific mission to the Sunda Strait and the volcanic island of Krakatoa had been entrusted to us."
    return t


def formal_tien_uren(en: str, nl: str) -> str:
    t = clean_garbage(en, nl)
    reps = [
        (r"\bI'll be damned\b", "I shall not be swayed"),
        (r"张稀哲", ""),
        (r"\bweitasch\b", "Alpine rucksack"),
        (r"\bpatron tasch\b", "cartridge pouch"),
        (r"\btedling\b", "trailing"),
        (r"\bUrsel\b", "Urso"),
        (r"\bUrsula\b", "Urso"),
        (r"\bLibrivox\b", "LibriVox"),
    ]
    for a, b in reps:
        t = re.sub(a, b, t, flags=re.I)
    if nl.strip() == "TIEN UREN OP JACHT.":
        return "Ten Hours on the Hunt."
    if nl.strip() == "EENVOUDIGE GRILLIGE INVAL.":
        return "A Simple Whimsical Fancy."
    if nl.strip().startswith("Er zijn lieden"):
        return "There are people who do not care for hunters, and they may not be wholly in the wrong."
    if nl.strip().startswith("Ik zal me"):
        return "I shall not be persuaded from that opinion by any late objection."
    return t


def formal_mijnheer(en: str, nl: str) -> str:
    t = clean_garbage(en, nl)
    reps = [
        (r"Prickleg|Prickbone|Prick's leg|Spikeleg|Priek|Prick\b", "Prikkebeen"),
        (r"\bchapel\b", "butterfly"),
        (r"\bChapel\b", "Butterfly"),
        (r"\bUrsel\b", "Urso"),
        (r"\bUrsula\b", "Urso"),
        (r"\bplayman\b", "musician"),
        (r"\bpredator\b", "band of robbers"),
        (r"\bLibrivox\b", "LibriVox"),
        (r"\b純理\b", ""),
        (r"\bFucking bone\b", "Prikkebeen"),
        (r"\bFat\b", "Dikkie"),
        (r"\bSpeleman\b", "The musician"),
        (r"\bPlomp\b", "Splash"),
        (r"\bplomt\b", "splashes"),
        (r"\bplomp\b", "splash"),
    ]
    for a, b in reps:
        t = re.sub(a, b, t, flags=re.I)
    return t


def refine_slug(slug: str, title: str, hand_file: str, post):
    nl = flatten(json.loads((REPO / "stories" / slug / "text" / "nl.json").read_text())["blocks"])
    hand = load_hand(hand_file)
    sentences = []
    for i, nl_s in enumerate(nl):
        if i in hand:
            sentences.append(hand[i])
            continue
        en = argos(nl_s)
        sentences.append(post(en, nl_s))
    doc = {"title": title, "sentences": sentences}
    out = CACHE / f"{slug}-en.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    empty = sum(1 for s in sentences if not str(s).strip())
    print(f"{slug}: {len(sentences)} sentences, {empty} empty")


def main():
    refine_slug("krakatau-en-de-straat-soenda", "Krakatoa and the Sunda Strait", "krakatau-hand.json", formal_krakatoa)
    refine_slug("tien-uren-op-jacht", "Ten Hours on the Hunt", "tien-uren-hand.json", formal_tien_uren)
    refine_slug("mijnheer-prikkebeen", "Mr Prikkebeen", "mijnheer-hand.json", formal_mijnheer)


if __name__ == "__main__":
    main()
