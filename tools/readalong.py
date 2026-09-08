#!/usr/bin/env python3
"""readalong.py — bouw een compleet verhaal voor de Readalong-site.

Schrijft de drie JSON-bestanden die assets/story.php verwacht, plus de
index.php-stub en de mp3 op de juiste plek. Twee bronnen, dezelfde uitvoer:

  from-audio   bestaande opname  -> Scribe transcribeert/aligneert -> timestamps
  from-text    bestaande tekst   -> ElevenLabs TTS -> audio + timestamps
  add-voice    extra stem bij een bestaand verhaal (tekst blijft ongewijzigd)
  resegment    bestaande verhalen in 2–3 halfzinnen knippen (tekst, vertalingen, timestamps)
  retranslate  vertaal alle segmenten opnieuw per halfzin (DeepL)
  reparagraph  te lange beurten in alinea's knippen (zinsvolgorde blijft gelijk)
  check        valideer bestaande verhalen tegen de invarianten uit story.php

Vereist de omgevingsvariabele XI_API_KEY. Voor from-audio is de permissie
speech_to_text nodig, voor from-text text_to_speech. Optioneel DEEPL_API_KEY
om de vertalingen automatisch te laten vullen.

Voorbeelden:
    export XI_API_KEY=...

    # Bestaande Noorse opname, script bekend (aanbevolen: minste correctiewerk)
    python3 tools/readalong.py from-audio \\
        --audio ~/Downloads/eventyr.mp3 --script ~/Downloads/eventyr.txt \\
        --slug tre-bukkene --heading "Tre bukkene Bruse" \\
        --voice-id kari --voice-name Kari --language no

    # Bestaande opname zonder script: Scribe levert ook de tekst
    python3 tools/readalong.py from-audio --audio opname.mp3 --slug mitt-eventyr \\
        --heading "Mitt eventyr" --voice-id kari --voice-name Kari --language no

    # Tekst voorlezen door een ElevenLabs-stem
    python3 tools/readalong.py from-text --text verhaal.txt --slug mitt-eventyr \\
        --heading "Mitt eventyr" --eleven-voice <voice_id> \\
        --voice-id kari --voice-name Kari --language no

    python3 tools/readalong.py check
    python3 tools/readalong.py resegment
    python3 tools/readalong.py resegment --slug taco-pa-fredag
    python3 tools/readalong.py retranslate
    python3 tools/readalong.py retranslate --slug taco-pa-fredag
    python3 tools/readalong.py reparagraph
    python3 tools/readalong.py reparagraph --slug taco-pa-fredag

Bij verwerking schat de agent het CEFR-niveau per bron (--level B1-B2) en vult
attribution (publiek) en rights (intern) in. Voorbeeld:

    python3 tools/readalong.py from-audio \\
        --audio opname.mp3 --script tekst.txt --slug mitt-eventyr \\
        --heading "Mitt eventyr" --voice-id kari --voice-name Kari --language no \\
        --level B1 --attribution-title "Mitt eventyr" --attribution-url https://... \\
        --rights-audio-reader Kari --rights-audio-license "CC BY 4.0"
"""

import argparse
import base64
import difflib
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ELEVEN = "https://api.elevenlabs.io/v1"

# Scribe wil ISO-639-3, de site gebruikt tweeletterige codes.
SCRIBE_LANG = {"no": "nor", "nb": "nor", "nn": "nor", "nl": "nld", "en": "eng",
               "de": "deu", "sv": "swe", "da": "dan", "fr": "fra", "es": "spa"}
DEEPL_LANG = {"no": "NB", "nb": "NB", "nl": "NL", "de": "DE", "sv": "SV",
              "da": "DA", "fr": "FR", "es": "ES"}

# Zinseinde, maar niet na een afkorting.
SENTENCE_END = re.compile(r"[.!?…]+[\"'»”’)\]]*$")
CLAUSE_END = re.compile(r"[,;:–—]+[\"'»”’)\]]*$")
ABBREVIATIONS = {
    "bl.a.", "f.eks.", "dvs.", "osv.", "kl.", "nr.", "ca.", "jf.", "m.m.",
    "o.l.", "pga.", "iht.", "mht.", "vha.", "dr.", "prof.", "st.", "bl.a",
}
# Woorden waar een halfzin natuurlijk mag beginnen (Noors, Nynorsk, Nederlands, Engels).
# Sterk: contrast/reden. Midden: gevolg/tijd. Zwak: opsomming/relatief — alleen als
# er geen betere breuk is.
STRONG_CONJUNCTIONS = {
    "men", "eller", "maar", "want", "omdat", "fordi", "mens", "terwijl",
    "hoewel", "zodat", "dus", "although", "because", "but", "or",
    "sidan", "dersom", "medan",
}
MEDIUM_CONJUNCTIONS = {
    "så", "da", "då", "for", "siden", "toen", "so", "while", "when",
    "når", "hvis", "als", "if", "then",
}
WEAK_CONJUNCTIONS = {
    "og", "en", "and", "som", "at", "der", "òg", "samt",
}
CONJUNCTIONS = STRONG_CONJUNCTIONS | MEDIUM_CONJUNCTIONS | WEAK_CONJUNCTIONS
LIST_CONJUNCTIONS = {"og", "en", "and", "òg"}
PRONOUNS = {
    "jeg", "du", "han", "hun", "vi", "de", "eg", "ho", "me", "dei",
    "ik", "jij", "hij", "zij", "we", "they", "i", "me", "mi", "min",
    "my", "haar", "his", "her", "dem", "oss", "ons",
}

# Mik op 2–3 halfzinnen, niet op kruimels en niet op 60-woordmonsters.
MAX_PARTS = 4
KEEP_MAX = 22          # korter blijft heel, tenzij een sterke breuk in het midden zit
TARGET_PART = 22       # gewenste lengte per halfzin
HARD_MAX_PART = 28     # daarboven nog een keer knippen als het kan
FLOOR_MIN = 6          # geen restjes korter dan dit (tenzij de hele zin korter is)

# Alinea's in de UI. Blokken tot MAX_PARAGRAPH_WORDS blijven heel (two-frogs,
# korte spreekbeurten). Langere lappen worden op zinsgrenzen geknipt.
TARGET_PARAGRAPH_WORDS = 50
MIN_PARAGRAPH_WORDS = 20
MAX_PARAGRAPH_WORDS = 80

# De handmatig afgestemde timestamps in de bestaande verhalen liggen niet op
# het eerste woord, maar in de stilte ervoor. Gemeten over de 61 zinnen van
# two-frogs en favorite-food geeft 0.6s de kleinste afwijking: mediaan 0.1s,
# p90 0.5s, maximaal 1.0s.
LEAD_IN = 0.6

# Licenties die geen extra toestemming vereisen voor publicatie.
FREE_LICENSE_HINTS = (
    "public domain", "publiek domein", "cc0", "cc-by", "cc by", "creative commons",
)

LEVEL_SCORES = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
LEVEL_SINGLE = re.compile(r"^(A[12]|B[12]|C[12])$")
LEVEL_RANGE = re.compile(r"^(A[12]|B[12]|C[12])-(A[12]|B[12]|C[12])$")


def parse_csv(value):
    return [part.strip() for part in value.split(",") if part.strip()]


def level_valid(level):
    if not level:
        return False
    level = level.upper().strip()
    if LEVEL_SINGLE.match(level):
        return True
    match = LEVEL_RANGE.match(level)
    return bool(match and match.group(1) in LEVEL_SCORES and match.group(2) in LEVEL_SCORES)


def level_average_score(level):
    level = level.upper().strip()
    if LEVEL_SINGLE.match(level):
        return float(LEVEL_SCORES[level])
    match = LEVEL_RANGE.match(level)
    if not match:
        return None
    low, high = match.group(1), match.group(2)
    return (LEVEL_SCORES[low] + LEVEL_SCORES[high]) / 2


def level_tier(level):
    score = level_average_score(level)
    if score is None:
        return None
    if score <= 2.5:
        return "beginner"
    if score <= 4.5:
        return "intermediate"
    return "advanced"


def rights_licenses(meta):
    licenses = []
    rights = meta.get("rights") or {}
    for section in ("text", "audio"):
        license_value = (rights.get(section) or {}).get("license")
        if license_value:
            licenses.append(license_value)
    source = meta.get("source") or {}
    if source.get("license"):
        licenses.append(source["license"])
    return licenses


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

def api_key(name, permission):
    key = os.environ.get(name)
    if not key:
        sys.exit(f"Zet {name} in je omgeving. Voor deze stap is de permissie "
                 f"'{permission}' nodig op de key.")
    return key


def post_json(url, payload, headers):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={**headers, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"{url} gaf HTTP {e.code}:\n{e.read().decode()[:600]}")


def post_multipart(url, fields, files, headers):
    boundary = uuid.uuid4().hex
    body = b""
    for k, v in fields.items():
        body += (f"--{boundary}\r\nContent-Disposition: form-data; "
                 f"name=\"{k}\"\r\n\r\n{v}\r\n").encode()
    for k, path in files.items():
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; "
                 f"filename=\"{Path(path).name}\"\r\n"
                 f"Content-Type: {ctype}\r\n\r\n").encode()
        body += Path(path).read_bytes() + b"\r\n"
    body += f"--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        url, data=body,
        headers={**headers, "Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"{url} gaf HTTP {e.code}:\n{e.read().decode()[:600]}")


# --------------------------------------------------------------------------
# Segmenteren
# --------------------------------------------------------------------------

def normalise_word(s):
    return re.sub(r"[^\w]", "", s.lower())


def split_sentences(paragraph):
    """Splits een alinea op zinseinden, met respect voor afkortingen en ordinalen."""
    sentences, current = [], []
    for token in paragraph.split():
        current.append(token)
        if not SENTENCE_END.search(token):
            continue
        lowered = token.lower()
        if lowered in ABBREVIATIONS or re.fullmatch(r"[A-ZÆØÅ]\.", token):
            continue
        # "14. desember", "1. marki" — geen zinseinde.
        if re.fullmatch(r"\d+\.", token):
            continue
        sentences.append(" ".join(current))
        current = []
    if current:
        sentences.append(" ".join(current))
    return sentences


def _is_list_conjunction(words, i):
    """True bij korte opsommingen: smør og hvitløk, jeg og søstera, taco og pizza."""
    w = normalise_word(words[i])
    if w not in LIST_CONJUNCTIONS:
        return False
    prev = normalise_word(words[i - 1]) if i else ""
    nxt = normalise_word(words[i + 1]) if i + 1 < len(words) else ""
    if prev in PRONOUNS or nxt in PRONOUNS:
        return True

    def dist_to_break(start, step):
        j = start + step
        count = 0
        while 0 <= j < len(words):
            nw = normalise_word(words[j])
            if (nw in CONJUNCTIONS or CLAUSE_END.search(words[j])
                    or SENTENCE_END.search(words[j])):
                return count
            count += 1
            j += step
        return count

    return dist_to_break(i, -1) <= 4 and dist_to_break(i, 1) <= 4


def _så_is_particle(words, i):
    """'På fredager så bada vi' — topicalisatie, geen voegwoord."""
    nxt = normalise_word(words[i + 1]) if i + 1 < len(words) else ""
    if nxt in {"mye", "mykje", "vidt", "pass", "klart", "nn"}:
        return True
    return i <= 4


def _cut_candidates(words, min_words):
    """(index, prioriteit) — lagere prioriteit is een natuurlijker breekpunt."""
    n = len(words)
    out = []
    skip_så = set()
    depth = 0
    for i, w in enumerate(words):
        opens = w.count("(") + w.count("[")
        closes = w.count(")") + w.count("]")
        inside_paren = depth + opens > closes  # nog in een haakje ná dit woord
        depth += opens - closes

        if i < min_words or n - i < min_words:
            continue
        nw = normalise_word(w)
        nxt = normalise_word(words[i + 1]) if i + 1 < n else ""

        if CLAUSE_END.search(w):
            # Komma's in "(født 1863, død 1950)" horen bij de tussenzin.
            if inside_paren:
                continue
            prio = 0
            # Komma's in de coda van een lange zin isoleren vaak een korte slotzin
            # ("..., det var nydelig") ten koste van een te lang middenstuk.
            if i + 1 > 0.85 * n and n > 40:
                prio = 2
            out.append((i + 1, prio))
            continue

        # "og så" / "en toen" / "en dan": gesproken zinsgrens, knip vóór og/en.
        if nw in LIST_CONJUNCTIONS and nxt in {"så", "da", "då", "toen", "dan", "then"}:
            out.append((i, 1))
            skip_så.add(i + 1)
            continue

        # "sånn at" / "slik at": doelzin.
        if nw in {"sånn", "slik", "zo"} and nxt == "at":
            out.append((i, 1))
            continue

        if i in skip_så:
            continue

        if nw in STRONG_CONJUNCTIONS:
            out.append((i, 1))
        elif nw in MEDIUM_CONJUNCTIONS:
            if nw == "så" and _så_is_particle(words, i):
                continue
            out.append((i, 2))
        elif nw in WEAK_CONJUNCTIONS:
            if _is_list_conjunction(words, i):
                continue
            out.append((i, 4))
    return out


def _target_parts(n, candidates, max_words):
    keep = max(KEEP_MAX, max_words)
    target = max(TARGET_PART, max_words)
    if n <= keep:
        return 1
    parts = max(2, -(-n // target))
    return min(parts, MAX_PARTS)


def _choose_cuts(words, max_words, min_words):
    n = len(words)
    floor_min = max(min_words, FLOOR_MIN)
    cands = _cut_candidates(words, min_words)
    parts = _target_parts(n, cands, max_words)
    if parts <= 1:
        return []

    def usable(idx, chosen, floor):
        prev = chosen[-1] if chosen else 0
        if idx - prev < floor or n - idx < floor:
            return False
        return all(abs(idx - u) >= floor for u in chosen)

    # Weinig delen: alleen een zwakke 'og' gebruiken als er geen sterke breuk is.
    strong = [(i, p) for i, p in cands if p <= 2]
    pool = strong or cands
    strong_floor = max(min_words, 5)

    chosen = []
    targets = [round(n * i / parts) for i in range(1, parts)]
    for target in targets:
        ranked = []
        for idx, prio in pool:
            if not usable(idx, chosen, strong_floor if prio <= 2 else floor_min):
                continue
            ranked.append((abs(idx - target) + prio * 6, idx))
        if ranked:
            chosen.append(min(ranked)[1])
            chosen.sort()

    # Als er te weinig sterke breuken zijn, vul aan met zwakkere (og/en).
    if len(chosen) < parts - 1:
        for target in targets:
            if len(chosen) >= parts - 1:
                break
            ranked = []
            for idx, prio in cands:
                floor = strong_floor if prio <= 2 else floor_min
                if not usable(idx, chosen, floor):
                    continue
                ranked.append((abs(idx - target) + prio * 6, idx))
            if ranked:
                chosen.append(min(ranked)[1])
                chosen.sort()

    if not chosen and cands:
        mid = n // 2
        idx, prio = min(cands, key=lambda c: (abs(c[0] - mid), c[1]))
        if min_words <= idx <= n - min_words and prio <= 2:
            chosen = [idx]

    # Geen midden-knip door een naamwoordgroep: zonder kandidaat blijft de zin heel,
    # behalve bij monsters zonder enige komma of voegwoord.
    if not chosen and n > HARD_MAX_PART * 2:
        chosen = [n // 2]
    return chosen


def _apply_cuts(words, cuts, min_words):
    if not cuts:
        return [words]
    parts, prev = [], 0
    for cut in cuts:
        if cut > prev:
            parts.append(words[prev:cut])
        prev = cut
    if prev < len(words):
        parts.append(words[prev:])

    floor_min = max(min_words, FLOOR_MIN)
    merged = []
    for part in parts:
        if merged and (len(part) < floor_min or len(merged[-1]) < floor_min):
            merged[-1] = merged[-1] + part
        else:
            merged.append(list(part))
    return merged or [words]


def split_long(words, max_words, min_words):
    """Hak een te lange zin in twee tot drie (hooguit vier) halfzinnen.

    Mik op natuurlijke breuken (komma, men/fordi, 'og så') en op stukken van
    ongeveer max_words woorden. Korte zinnen zonder zo'n breuk blijven heel;
    er wordt niet meer standaard in het midden door een woordgroep geknipt.
    """
    if max_words <= 0 or len(words) <= max_words:
        return [words]
    cuts = _choose_cuts(words, max_words, min_words)
    parts = _apply_cuts(words, cuts, min_words)

    i = 0
    while i < len(parts) and len(parts) < MAX_PARTS:
        part = parts[i]
        if len(part) > HARD_MAX_PART:
            extra_cuts = _choose_cuts(part, max_words, min_words)
            extra = _apply_cuts(part, extra_cuts, min_words)
            if len(extra) > 1 and len(parts) + len(extra) - 1 <= MAX_PARTS:
                parts[i:i + 1] = extra
                continue
        i += 1
    return parts


def segment_text(text, max_words, min_words, literal=False):
    """Zin- en halfzinsplitsing voor één stuk tekst."""
    parts = []
    pieces = [text] if literal else split_sentences(text)
    for sentence in pieces:
        words = sentence.split()
        if not words:
            continue
        for chunk in split_long(words, max_words, min_words):
            if chunk:
                parts.append(" ".join(chunk))
    return parts


FUNCTION_ENDS = {
    "en", "og", "and", "de", "het", "een", "the", "a", "an", "van", "of", "to",
    "naar", "til", "på", "i", "in", "we", "ik", "jeg", "vi", "den", "det",
    "dat", "die", "this", "that", "te", "å", "om", "for", "at", "a",
}


def _snap_cut(words, ideal, lo, hi):
    """Schuif een proportionele knip naar de dichtstbijzijnde natuurlijke breuk."""
    lo = max(1, lo)
    hi = min(len(words) - 1, hi)
    if lo > hi:
        return max(1, min(len(words) - 1, ideal))
    ideal = max(lo, min(hi, ideal))

    in_range = [(idx, prio) for idx, prio in _cut_candidates(words, min_words=1)
                if lo <= idx <= hi]
    if in_range:
        return min(in_range, key=lambda c: abs(c[0] - ideal) + c[1] * 4)[0]

    best, best_cost = ideal, 10**9
    for i in range(lo, hi + 1):
        prev = words[i - 1]
        cur = words[i]
        cost = abs(i - ideal) * 2
        if SENTENCE_END.search(prev):
            cost -= 8
        elif CLAUSE_END.search(prev):
            cost -= 6
        elif normalise_word(cur) in STRONG_CONJUNCTIONS:
            cost -= 5
        elif normalise_word(cur) in MEDIUM_CONJUNCTIONS:
            cost -= 3
        elif normalise_word(cur) in WEAK_CONJUNCTIONS:
            cost -= 1
        if normalise_word(prev) in FUNCTION_ENDS:
            cost += 8
        if cost < best_cost:
            best, best_cost = i, cost
    return best


def split_translation(source, parts, translated, min_words=4):
    """Knip de vertaling in dezelfde verhouding als de brondelen."""
    if len(parts) <= 1:
        return [translated]
    if not (translated or "").strip():
        return [""] * len(parts)

    src_n = len(source.split()) or 1
    tr_words = translated.split()
    tr_n = len(tr_words)
    if tr_n < len(parts):
        # Te weinig woorden: alles in het eerste deel, rest leeg laten heeft geen zin;
        # verdeel zo eerlijk mogelijk per woord.
        out, idx = [], 0
        for k, part in enumerate(parts):
            take = 1 if k < tr_n else 0
            if k == len(parts) - 1:
                take = tr_n - idx
            out.append(" ".join(tr_words[idx:idx + take]))
            idx += take
        return out

    floor = max(1, min(min_words, tr_n // len(parts)))
    cuts, acc = [], 0
    remaining_parts = len(parts)
    for part in parts[:-1]:
        remaining_parts -= 1
        acc += len(part.split())
        ideal = round(acc / src_n * tr_n)
        lo = (cuts[-1] + floor) if cuts else floor
        hi = tr_n - floor * remaining_parts
        if lo > hi:
            lo = hi
        cuts.append(_snap_cut(tr_words, ideal, lo, hi))

    out, prev = [], 0
    for cut in cuts:
        out.append(" ".join(tr_words[prev:cut]))
        prev = cut
    out.append(" ".join(tr_words[prev:]))
    return out


def interpolate_timestamps(old_ts, groups, duration):
    """Nieuwe starttijden per halfzin, evenredig met het woordaantal in de oude zin.

    groups[i] is de lijst woordenaantallen van de nieuwe delen uit oude zin i.
    """
    new = []
    n = len(old_ts)
    for i, word_counts in enumerate(groups):
        start = float(old_ts[i])
        end = float(old_ts[i + 1]) if i + 1 < n else float(duration)
        total = sum(word_counts) or 1
        span = max(end - start, 0.1 * len(word_counts))
        offset = 0
        for count in word_counts:
            new.append(round(start + span * (offset / total), 1))
            offset += count
    for i in range(1, len(new)):
        if new[i] <= new[i - 1]:
            new[i] = round(new[i - 1] + 0.1, 1)
    return new


def resegment_blocks(blocks, timestamps_lists, duration, max_words, min_words):
    """Splits bestaande zinnen; timestamps worden evenredig geïnterpoleerd."""
    new_blocks = []
    groups = []
    split_map = []
    for block in blocks:
        new_block = {k: v for k, v in block.items() if k != "sentences"}
        new_sents = []
        for sentence in block["sentences"]:
            pieces = (split_sentences(sentence)
                      if len(sentence.split()) > KEEP_MAX else [sentence])
            parts = []
            for piece in pieces:
                parts.extend(" ".join(chunk) for chunk in split_long(
                    piece.split(), max_words, min_words) if chunk)
            if not parts:
                parts = [sentence]
            new_sents.extend(parts)
            groups.append([max(1, len(p.split())) for p in parts])
            split_map.append((sentence, parts))
        new_block["sentences"] = new_sents
        new_blocks.append(new_block)

    new_ts_lists = [
        interpolate_timestamps(ts, groups, duration) for ts in timestamps_lists
    ]
    return new_blocks, new_ts_lists, split_map


def refresh_translations(sentences, split_map, translation_lists, language, langs,
                         min_words):
    """Vertaal elk segment opnieuw; fallback naar mechanisch knippen zonder DeepL."""
    if os.environ.get("DEEPL_API_KEY"):
        return translate_all(sentences, language, langs)

    print("  DEEPL_API_KEY niet gezet: vertalingen mechanisch geknipt (fallback).")
    out = {}
    for lang, trans_list in zip(langs, translation_lists):
        refreshed = []
        for i, (original, parts) in enumerate(split_map):
            original_tr = trans_list[i] if i < len(trans_list) else ""
            refreshed.extend(split_translation(original, parts, original_tr, min_words))
        out[lang] = refreshed
    return out


SPEAKER_LINE = re.compile(r"^([^\s:][^:]{0,30}):\s*(.+)$")


def build_blocks(raw_text, max_words, min_words, literal_lines=False):
    """Zet ruwe tekst om naar blocks, en geef ook de sprekers terug.

    Lege regels scheiden de alinea's. Regels in de vorm "Naam: tekst" maken
    een dialoog: elke regel wordt één block met die spreker, wat precies de
    structuur van stories/favorite-food is.

    Met literal_lines is elke regel precies één segment. Dat is nodig voor
    segmenten die meerdere zinnen bevatten, zoals "Oh pizza, dat is cool!
    Waarom vind je dat zo lekker?" — automatisch splitsen zou daar twee
    segmenten van maken en dan lopen de timestamps niet meer gelijk.
    """
    def segment(text):
        return segment_text(text, max_words, min_words, literal=literal_lines)

    blocks, speakers = [], []

    for paragraph in re.split(r"\n\s*\n", raw_text.strip()):
        if not paragraph.strip():
            continue
        lines = [line.strip() for line in paragraph.splitlines() if line.strip()]
        matches = [SPEAKER_LINE.match(line) for line in lines]

        if all(matches):
            for match in matches:
                name, said = match.group(1).strip(), match.group(2).strip()
                if name not in speakers:
                    speakers.append(name)
                sentences = segment(" ".join(said.split()))
                if sentences:
                    blocks.append({"speaker": name, "sentences": sentences})
            continue

        if literal_lines:
            sentences = [s for line in lines for s in segment(" ".join(line.split()))]
        else:
            sentences = segment(" ".join(paragraph.split()))
        if sentences:
            blocks.append({"sentences": sentences})

    return blocks, speakers


def blocks_from_pauses(sentences, timestamps, gap_threshold, sentence_ends=None):
    """Zonder script kennen we geen alinea's; leid ze af uit de lange stiltes."""
    blocks, current = [], []
    for i, sentence in enumerate(sentences):
        if sentence_ends is not None and i:
            gap = timestamps[i] - sentence_ends[i - 1]
        else:
            gap = timestamps[i] - timestamps[i - 1] if i else 0.0
        if current and i and gap > gap_threshold:
            blocks.append({"sentences": current})
            current = []
        current.append(sentence)
    if current:
        blocks.append({"sentences": current})
    return blocks


def ends_sentence(text):
    """True als het segment op een echt zinseinde stopt, geen f.eks. of 14."""
    tokens = text.split()
    if not tokens:
        return False
    last = tokens[-1]
    if not SENTENCE_END.search(last):
        return False
    if last.lower() in ABBREVIATIONS or re.fullmatch(r"[A-ZÆØÅ]\.", last):
        return False
    if re.fullmatch(r"\d+\.", last):
        return False
    return True


def starts_sentence(text):
    """True als het segment als nieuwe zin leest (hoofdletter na aanhalingstekens)."""
    stripped = text.lstrip("«»\"'“”‘’")
    return bool(stripped) and stripped[0].isupper()


def paragraphise_block(block, target=TARGET_PARAGRAPH_WORDS,
                       min_words=MIN_PARAGRAPH_WORDS,
                       max_words=MAX_PARAGRAPH_WORDS):
    """Splits een te lange beurt in alinea's; zinsvolgorde blijft gelijk."""
    sentences = list(block.get("sentences") or [])
    total = sum(len(s.split()) for s in sentences)
    if total <= max_words or len(sentences) < 2:
        return [block]

    paragraphs = []
    current = []
    current_words = 0

    def flush():
        nonlocal current, current_words
        if current:
            paragraphs.append(current)
            current, current_words = [], 0

    for sentence in sentences:
        words = max(1, len(sentence.split()))
        if current:
            prev = current[-1]
            at_boundary = ends_sentence(prev) or starts_sentence(sentence)
            prev_tokens = prev.split()
            clause_end = bool(prev_tokens and CLAUSE_END.search(prev_tokens[-1]))
            if current_words >= target and at_boundary:
                flush()
            elif current_words >= max_words and (at_boundary or clause_end):
                flush()
        current.append(sentence)
        current_words += words
    flush()

    if len(paragraphs) >= 2:
        tail_words = sum(len(s.split()) for s in paragraphs[-1])
        if tail_words < min_words:
            paragraphs[-2].extend(paragraphs[-1])
            paragraphs.pop()

    if len(paragraphs) <= 1:
        return [block]

    meta = {k: v for k, v in block.items() if k != "sentences"}
    return [{**meta, "sentences": part} for part in paragraphs]


def paragraphise_blocks(blocks, target=TARGET_PARAGRAPH_WORDS,
                        min_words=MIN_PARAGRAPH_WORDS,
                        max_words=MAX_PARAGRAPH_WORDS):
    """Splits te lange blocks; korte alinea's en sprekers blijven intact."""
    out = []
    for block in blocks:
        out.extend(paragraphise_block(
            block, target=target, min_words=min_words, max_words=max_words))
    return out


def flatten(blocks):
    return [s for b in blocks for s in b["sentences"]]


# --------------------------------------------------------------------------
# Timing uit Scribe
# --------------------------------------------------------------------------

def scribe(audio, language, cache=None):
    if cache and Path(cache).exists():
        print(f"  cache: {cache}")
        return json.loads(Path(cache).read_text())

    key = api_key("XI_API_KEY", "speech_to_text")
    print(f"  Scribe transcribeert {Path(audio).name} ...")
    result = post_multipart(
        f"{ELEVEN}/speech-to-text",
        {"model_id": "scribe_v1", "language_code": SCRIBE_LANG.get(language, language),
         "timestamps_granularity": "word", "diarize": "false"},
        {"file": audio}, {"xi-api-key": key})
    if cache:
        Path(cache).write_text(json.dumps(result, ensure_ascii=False))
    return result


def sentence_times_from_words(sentences, asr_words, lead_in, allow_intro=False):
    """Geef per zin een starttijd, via globale alignment script <-> transcript.

    Doortellen op woordaantal loopt scheef zodra de voorlezer een woord
    overslaat of toevoegt, dus we aligneren de twee woordenreeksen en lezen
    de tijd af bij het eerste woord van elke zin dat matcht.
    
    Met allow_intro=True mag de eerste zin op zijn natuurlijke tijd beginnen,
    handig voor opnames met intro-audio die niet in de tekst staat.
    """
    tokens = [w for w in asr_words
              if w.get("type") == "word" and normalise_word(w.get("text", ""))]
    if not tokens:
        sys.exit("Scribe gaf geen woorden terug.")
    asr = [normalise_word(w["text"]) for w in tokens]

    script, sentence_start = [], []
    for sentence in sentences:
        sentence_start.append(len(script))
        script += [normalise_word(t) for t in re.findall(r"[\w’']+", sentence)
                   if normalise_word(t)]

    matcher = difflib.SequenceMatcher(a=script, b=asr, autojunk=False)
    mapping = {}
    for i1, j1, size in matcher.get_matching_blocks():
        for k in range(size):
            mapping[i1 + k] = j1 + k

    coverage = len(mapping) / len(script) * 100 if script else 0
    print(f"  alignment: {coverage:.1f}% van de scriptwoorden teruggevonden "
          f"({len(script)} script / {len(asr)} gehoord)")
    if coverage < 90:
        print("  LET OP: lage dekking. Klopt het script bij deze opname?")

    timestamps, unresolved = [], []
    for index, start_word in enumerate(sentence_start):
        asr_index = next((mapping[start_word + d] for d in range(8)
                          if start_word + d in mapping), None)
        if asr_index is None:
            unresolved.append(index)
            timestamps.append(None)
            continue
        word_start = float(tokens[asr_index]["start"])
        prev_end = float(tokens[asr_index - 1]["end"]) if asr_index > 0 else 0.0
        
        if index == 0:
            # Voor de eerste zin: start op 0.0, tenzij allow_intro=True
            # Dan laten we de eerste zin op zijn natuurlijke tijd beginnen
            if allow_intro and word_start > 0.1:
                # Zet de timestamp iets voor de audio (maar maximaal op 0.0)
                timestamps.append(round(max(0.0, word_start - lead_in), 1))
            else:
                timestamps.append(0.0)
        else:
            # Bereken de beschikbare ruimte tussen het einde van de vorige zin
            # en het begin van de huidige zin
            gap = word_start - prev_end
            
            # Als er genoeg ruimte is (>= lead_in), plaats dan de timestamp
            # lead_in seconden voor de audio begint
            if gap >= lead_in:
                timestamps.append(round(word_start - lead_in, 1))
            # Anders, plaats de timestamp in het midden van de beschikbare ruimte
            # Dit zorgt ervoor dat de UI altijd verspringt vóór de audio begint
            else:
                timestamps.append(round(prev_end + gap / 2, 1))

    for index in unresolved:
        prev = next((timestamps[i] for i in range(index - 1, -1, -1)
                     if timestamps[i] is not None), 0.0)
        timestamps[index] = prev
        print(f"  LET OP: zin {index} niet te aligneren, timestamp overgenomen "
              f"van de vorige zin. Corrigeer met de dev-controls.")

    sentence_ends = []
    for index, start_word in enumerate(sentence_start):
        end_word = ((sentence_start[index + 1] - 1)
                    if index + 1 < len(sentence_start) else len(script) - 1)
        end_asr = next((mapping[w] for w in range(end_word, start_word - 1, -1)
                        if w in mapping), None)
        if end_asr is not None:
            sentence_ends.append(float(tokens[end_asr]["end"]))
        elif sentence_ends:
            sentence_ends.append(sentence_ends[-1])
        else:
            sentence_ends.append(float(tokens[-1]["end"]))

    return timestamps, sentence_ends, float(tokens[-1]["end"])


# --------------------------------------------------------------------------
# Timing uit TTS
# --------------------------------------------------------------------------

def tts(text, eleven_voice, model, language):
    key = api_key("XI_API_KEY", "text_to_speech")
    if re.search(r"\d", text):
        print("  LET OP: de tekst bevat cijfers. Tekstnormalisatie staat uit, "
              "dus die worden voorgelezen zoals ze staan. Schrijf getallen "
              "voluit als dat niet klopt.")
    print(f"  TTS genereert {len(text)} tekens met {model} ...")
    payload = {"text": text, "model_id": model, "language_code": language,
               "output_format": "mp3_44100_128", "apply_text_normalization": "off"}
    result = post_json(f"{ELEVEN}/text-to-speech/{eleven_voice}/with-timestamps",
                       payload, {"xi-api-key": key})

    alignment = result.get("alignment")
    if not alignment:
        sys.exit("De API gaf geen alignment terug. Dit model ondersteunt "
                 "with-timestamps kennelijk niet; probeer eleven_flash_v2_5.")
    return base64.b64decode(result["audio_base64"]), alignment


def sentence_times_from_chars(sentences, full_text, alignment, lead_in):
    """Lees de starttijd per zin af uit de character-timings van de TTS-respons."""
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]

    if "".join(chars) != full_text:
        print("  LET OP: de teruggegeven characters wijken af van de invoertekst; "
              "de timing wordt op de dichtstbijzijnde positie gelegd.")

    timestamps, cursor = [], 0
    for index, sentence in enumerate(sentences):
        position = full_text.find(sentence, cursor)
        if position < 0:
            position = cursor
        cursor = position + len(sentence)

        word_start = float(starts[min(position, len(starts) - 1)])
        prev_end = float(ends[position - 1]) if position > 0 else 0.0
        
        if index == 0:
            timestamps.append(0.0)
        else:
            # Bereken de beschikbare ruimte tussen het einde van de vorige zin
            # en het begin van de huidige zin
            gap = word_start - prev_end
            
            # Als er genoeg ruimte is (>= lead_in), plaats dan de timestamp
            # lead_in seconden voor de audio begint
            if gap >= lead_in:
                timestamps.append(round(word_start - lead_in, 1))
            # Anders, plaats de timestamp in het midden van de beschikbare ruimte
            # Dit zorgt ervoor dat de UI altijd verspringt vóór de audio begint
            else:
                timestamps.append(round(prev_end + gap / 2, 1))

    return timestamps, float(ends[-1])


# --------------------------------------------------------------------------
# Vertalen
# --------------------------------------------------------------------------

def translate(sentences, source_language, target="EN-GB"):
    """Vertaal zin voor zin, zodat de indices exact overeenkomen."""
    key = os.environ.get("DEEPL_API_KEY")
    if not key:
        print("  DEEPL_API_KEY niet gezet: translations krijgen lege strings. "
              "Vul ze zelf in of laat het door de agent doen.")
        return ["" for _ in sentences]

    host = "api-free.deepl.com" if key.endswith(":fx") else "api.deepl.com"
    print(f"  DeepL vertaalt {len(sentences)} zinnen ...")
    result = post_json(
        f"https://{host}/v2/translate",
        {"text": sentences, "source_lang": DEEPL_LANG.get(source_language, source_language.upper()),
         "target_lang": target, "preserve_formatting": True},
        {"Authorization": f"DeepL-Auth-Key {key}"})

    translations = [t["text"] for t in result["translations"]]
    if len(translations) != len(sentences):
        sys.exit(f"DeepL gaf {len(translations)} vertalingen voor "
                 f"{len(sentences)} zinnen terug.")
    return translations


def translate_all(sentences, source_language, langs):
    """Vertaal naar meerdere doeltalen; lege lijsten als DeepL ontbreekt."""
    targets = {"en": "EN-GB", "nl": "NL", "de": "DE", "fr": "FR", "es": "ES"}
    out = {}
    for lang in langs:
        out[lang] = translate(sentences, source_language, targets.get(lang, lang.upper()))
    return out


def trim_blocks(blocks, last_sentence_index):
    """Behoud alleen zinnen t/m last_sentence_index (inclusief)."""
    trimmed, idx = [], 0
    for block in blocks:
        kept = []
        for sentence in block["sentences"]:
            if idx > last_sentence_index:
                break
            kept.append(sentence)
            idx += 1
        if kept:
            new_block = {k: v for k, v in block.items() if k != "sentences"}
            new_block["sentences"] = kept
            trimmed.append(new_block)
        if idx > last_sentence_index:
            break
    return trimmed


def trim_to_sentence_boundary(blocks, timestamps, sentence_ends, max_duration, margin=0.5):
    """Knip af na de laatste volledige zin binnen max_duration."""
    last_idx = -1
    for index, end in enumerate(sentence_ends):
        if end <= max_duration:
            last_idx = index
    if last_idx < 0:
        sys.exit(f"Geen volledige zin binnen {max_duration}s gevonden.")
    audio_end = sentence_ends[last_idx] + margin
    print(f"  knip op zinsgrens: zin {last_idx + 1}/{len(sentence_ends)}, "
          f"audio tot {audio_end:.1f}s")
    return (
        trim_blocks(blocks, last_idx),
        timestamps[: last_idx + 1],
        audio_end,
    )


# --------------------------------------------------------------------------
# Audio
# --------------------------------------------------------------------------

def probe_duration(path):
    if not shutil.which("ffprobe"):
        return None
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        return None


def prepare_audio(source, dest, start=None, duration=None):
    """Zet de audio als mp3 op zijn plek, en knip optioneel een fragment."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    needs_ffmpeg = start is not None or duration is not None or \
        Path(source).suffix.lower() != ".mp3"

    if not needs_ffmpeg:
        shutil.copy(source, dest)
        return dest

    if not shutil.which("ffmpeg"):
        sys.exit("Hiervoor is ffmpeg nodig (brew install ffmpeg). Of lever een "
                 "mp3 aan die al goed staat, zonder --start en --duration.")
    cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-y"]
    if start is not None:
        cmd += ["-ss", str(start)]
    cmd += ["-i", str(source)]
    if duration is not None:
        cmd += ["-t", str(duration)]
    cmd += ["-codec:a", "libmp3lame", "-b:a", "128k", "-ac", "1", str(dest)]
    subprocess.run(cmd, check=True)
    return dest


# --------------------------------------------------------------------------
# Wegschrijven en valideren
# --------------------------------------------------------------------------

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    print(f"  geschreven: {path.relative_to(REPO)}")


def next_order(stories_dir):
    orders = [json.loads(p.read_text()).get("order", 0)
              for p in stories_dir.glob("*/story.json")]
    return max(orders, default=0) + 1


def write_story(slug, heading, language, story_type, blocks, translation_sets, titles,
                voice, order=None, published=False, speakers=None, level=None,
                attribution=None, rights=None, kind=None):
    story_dir = REPO / "stories" / slug
    blocks = paragraphise_blocks(blocks)
    sentences = flatten(blocks)

    for lang, translated in translation_sets.items():
        if len(translated) != len(sentences):
            sys.exit(f"{lang}: {len(translated)} vertalingen voor {len(sentences)} zinnen.")
    if len(voice["timestamps"]) != len(sentences):
        sys.exit(f"{len(voice['timestamps'])} timestamps voor {len(sentences)} zinnen.")

    story_json = story_dir / "story.json"
    if story_json.exists():
        meta = json.loads(story_json.read_text())
        meta["voices"] = [v for v in meta["voices"] if v["id"] != voice["id"]] + [voice]
    else:
        meta = {"id": slug, "type": story_type, "language": language,
                "order": order if order is not None else next_order(REPO / "stories"),
                "published": published, "voices": [voice]}
    if level:
        meta["level"] = level.upper().strip()
    if attribution:
        meta["attribution"] = attribution
    if rights:
        meta["rights"] = rights
    if kind:
        meta["kind"] = kind
    write_json(story_json, meta)

    text = {"heading": heading}
    if speakers:
        text["speakers"] = speakers
    text["blocks"] = blocks
    write_json(story_dir / "text" / f"{language}.json", text)

    for lang, translated in translation_sets.items():
        write_json(story_dir / "translations" / f"{lang}.json",
                   {"title": titles.get(lang, heading), "sentences": translated})

    stub = story_dir / "index.php"
    if not stub.exists():
        stub.write_text("<?php\n$_GET['slug'] = basename(__DIR__);\n"
                        "require __DIR__ . '/../view.php';\n", encoding="utf-8")
        print(f"  geschreven: {stub.relative_to(REPO)}")

    return meta


def check_stories():
    """Herhaal de controles die story.php bij het renderen doet."""
    problems = 0
    for story_json in sorted((REPO / "stories").glob("*/story.json")):
        story_dir = story_json.parent
        meta = json.loads(story_json.read_text())
        label = story_dir.name
        issues = []

        if meta.get("id") != story_dir.name:
            issues.append(f"id '{meta.get('id')}' wijkt af van de map")

        level = meta.get("level")
        if level and not level_valid(level):
            issues.append(f"level '{level}' is geen geldig CEFR-formaat (bijv. B1 of B1-B2)")
        elif meta.get("published") and not level:
            issues.append("gepubliceerd maar zonder level — zet --level bij verwerking")

        for license_value in rights_licenses(meta):
            lic = license_value.lower()
            if not any(hint in lic for hint in FREE_LICENSE_HINTS):
                issues.append(f"licentie '{license_value}' — controleer toestemming vóór publicatie")

        for voice in meta.get("voices", []):
            text_key = voice.get("text", meta["language"])
            text_path = story_dir / "text" / f"{text_key}.json"
            if not text_path.exists():
                issues.append(f"stem '{voice['id']}': {text_path.name} bestaat niet")
                continue
            count = len(flatten(json.loads(text_path.read_text())["blocks"]))
            if len(voice["timestamps"]) != count:
                issues.append(f"stem '{voice['id']}': {len(voice['timestamps'])} "
                              f"timestamps voor {count} zinnen")
            audio = REPO / "audio" / meta["id"] / meta["language"] / f"{voice['id']}.mp3"
            if not audio.exists():
                issues.append(f"stem '{voice['id']}': {audio.relative_to(REPO)} ontbreekt")

        for translation_path in (story_dir / "translations").glob("*.json"):
            translation = json.loads(translation_path.read_text())
            text_path = story_dir / "text" / f"{meta['language']}.json"
            if not text_path.exists():
                continue
            count = len(flatten(json.loads(text_path.read_text())["blocks"]))
            got = len(translation.get("sentences", []))
            if got != count:
                issues.append(f"{translation_path.name}: {got} vertalingen voor {count} zinnen")
            empty = [i for i, s in enumerate(translation.get("sentences", [])) if not s.strip()]
            if empty:
                issues.append(f"{translation_path.name}: {len(empty)} lege vertalingen "
                              f"(index {empty[:5]}{'...' if len(empty) > 5 else ''})")

        status = "ok" if not issues else "FOUT"
        flag = "" if meta.get("published") else "  (niet gepubliceerd)"
        print(f"{status:>4}  {label}{flag}")
        for issue in issues:
            print(f"        - {issue}")
        problems += len(issues)

    print(f"\n{problems} probleem(en)")
    return 1 if problems else 0


def report(slug, blocks, timestamps, translation_sets, duration):
    sentences = flatten(blocks)
    primary = translation_sets.get("en") or next(iter(translation_sets.values()))
    print(f"\n{len(sentences)} zinnen in {len(blocks)} alinea's, {duration:.0f}s audio")
    for i, (sentence, t) in enumerate(zip(sentences, timestamps)):
        mark = "" if primary[i].strip() else "  [geen vertaling]"
        print(f"  {i:>3} [{t:>6.1f}] {sentence[:64]}{mark}")
    print(f"\ntimestamps: {timestamps}")
    print(f"\nBekijk het resultaat op http://localhost:8765/stories/{slug}")
    print("Zet published op true in story.json als het klopt.")


def build_attribution(args):
    title = getattr(args, "attribution_title", None) or getattr(args, "source_title", None)
    url = getattr(args, "attribution_url", None) or getattr(args, "source_url", None)
    if not title and not url:
        return None
    attribution = {}
    if title:
        attribution["title"] = title
    if url:
        attribution["url"] = url
    return attribution


def build_rights(args):
    rights = {}
    text = {}
    audio = {}

    text_source = getattr(args, "rights_text_source", None)
    text_license = getattr(args, "rights_text_license", None) or getattr(args, "source_license", None)
    text_url = getattr(args, "rights_text_url", None) or getattr(args, "source_url", None)
    if text_source:
        text["source"] = text_source
    if text_license:
        text["license"] = text_license
    if text_url:
        text["url"] = text_url
    if text:
        rights["text"] = text

    audio_reader = getattr(args, "rights_audio_reader", None) or getattr(args, "source_author", None)
    audio_recorded = getattr(args, "rights_audio_recorded", None)
    audio_license = getattr(args, "rights_audio_license", None) or getattr(args, "source_license", None)
    audio_url = getattr(args, "rights_audio_url", None)
    if audio_reader:
        audio["reader"] = audio_reader
    if audio_recorded:
        audio["recorded"] = audio_recorded
    if audio_license:
        audio["license"] = audio_license
    if audio_url:
        audio["url"] = audio_url
    if audio:
        rights["audio"] = audio

    note = getattr(args, "rights_note", None) or getattr(args, "source_note", None)
    if note:
        rights["note"] = note

    return rights or None


def story_metadata(args):
    level = getattr(args, "level", None)
    if level and not level_valid(level):
        sys.exit(f"Ongeldig level '{level}'. Gebruik bijv. A2, B1-B2 of C1.")
    if level:
        tier = level_tier(level)
        print(f"  level: {level.upper()} ({tier})")
    return level, build_attribution(args), build_rights(args)


def build_titles(args):
    langs = parse_csv(args.translations)
    lang_attrs = {"en": "title_en", "nl": "title_nl"}
    titles = {}
    for lang in langs:
        attr = lang_attrs.get(lang)
        titles[lang] = ((getattr(args, attr, None) if attr else None)
                        or args.title or args.heading)
    return titles


# --------------------------------------------------------------------------
# Commando's
# --------------------------------------------------------------------------

def add_common(parser):
    parser.add_argument("--slug", required=True, help="mapnaam, ook de story-id")
    parser.add_argument("--language", default="no", help="taalcode van de tekst (default no)")
    parser.add_argument("--voice-id", required=True, help="id van de stem, ook de mp3-naam")
    parser.add_argument("--voice-name", help="weergavenaam (default: voice-id met hoofdletter)")
    parser.add_argument("--dialect", help="optioneel, komt tussen haakjes achter de naam")
    parser.add_argument("--type", default="default", choices=["default", "dialogue"])
    parser.add_argument("--kind", choices=["podcast", "news", "book", "email", "weather", "story"],
                        help="inhoudstype op de startpagina")
    parser.add_argument("--order", type=int, help="sorteerpositie op de startpagina")
    parser.add_argument("--publish", action="store_true", help="zet published op true")
    parser.add_argument("--lead-in", type=float, default=LEAD_IN,
                        help=f"seconden voor het eerste woord (default {LEAD_IN})")
    parser.add_argument("--allow-intro", action="store_true",
                        help="laat de eerste zin op zijn natuurlijke tijd beginnen (handig voor intro-audio)")
    parser.add_argument("--max-words", type=int, default=16,
                        help="langer wordt in 2–3 halfzinnen gesplitst (0 = nooit)")
    parser.add_argument("--min-words", type=int, default=4)
    parser.add_argument("--lines", action="store_true",
                        help="elke regel is precies één segment in plaats van "
                             "automatisch op zinseinden splitsen")
    parser.add_argument("--translations", default="en",
                        help="komma-gescheiden vertaaltalen (default en)")
    parser.add_argument("--title", help="titel in de standaardvertaling (default: heading)")
    parser.add_argument("--title-nl", help="Nederlandse titel voor translations/nl.json")
    parser.add_argument("--title-en", help="Engelse titel voor translations/en.json")
    parser.add_argument("--level", help="CEFR-niveau, bijv. A2, B1-B2 of C1 (agent-inschatting)")
    parser.add_argument("--attribution-title", help="titel voor publieke bronvermelding")
    parser.add_argument("--attribution-url", help="link voor publieke bronvermelding")
    parser.add_argument("--rights-text-source", help="intern: bron van de tekst")
    parser.add_argument("--rights-text-license", help="intern: licentie van de tekst")
    parser.add_argument("--rights-text-url", help="intern: url van de tekstbron")
    parser.add_argument("--rights-audio-reader", help="intern: voorlezer/opnamestem")
    parser.add_argument("--rights-audio-recorded", help="intern: opnamedatum (YYYY-MM-DD)")
    parser.add_argument("--rights-audio-license", help="intern: licentie van de audio")
    parser.add_argument("--rights-audio-url", help="intern: url van de audiobron")
    parser.add_argument("--rights-note", help="intern: extra opmerking")
    parser.add_argument("--source-title", help="alias voor --attribution-title")
    parser.add_argument("--source-author", help="alias voor --rights-audio-reader")
    parser.add_argument("--source-url", help="alias voor --attribution-url en --rights-text-url")
    parser.add_argument("--source-license", help="alias voor --rights-text-license en --rights-audio-license")
    parser.add_argument("--source-note", help="alias voor --rights-note")


def resolve_type(requested, speakers):
    """story-content.php gaat op text['speakers'] af, dus die twee moeten kloppen."""
    if speakers and requested != "dialogue":
        print(f"  sprekers gevonden ({', '.join(speakers)}), type wordt dialogue")
        return "dialogue"
    if requested == "dialogue" and not speakers:
        sys.exit("--type dialogue vraagt regels in de vorm 'Naam: tekst' in de "
                 "brontekst, anders blijft text['speakers'] leeg en rendert de "
                 "site het alsnog als gewoon verhaal.")
    return requested


def voice_entry(args, timestamps, duration):
    entry = {"id": args.voice_id,
             "name": args.voice_name or args.voice_id.replace("-", " ").title(),
             "duration": int(round(duration)),
             "timestamps": timestamps}
    if getattr(args, "dialect", None):
        entry["dialect"] = args.dialect
    return entry


def cmd_from_audio(args):
    audio = Path(args.audio).expanduser()
    if not audio.exists():
        sys.exit(f"{audio} bestaat niet.")

    dest = REPO / "audio" / args.slug / args.language / f"{args.voice_id}.mp3"
    clip_duration = args.clip_duration or args.duration
    print("Audio klaarzetten")
    prepare_audio(audio, dest, args.start, clip_duration)
    print(f"  {dest.relative_to(REPO)}")

    print("Transcriberen")
    result = scribe(dest, args.language, args.cache)

    max_words = args.max_words if args.max_words > 0 else 10 ** 6
    allow_intro = getattr(args, 'allow_intro', False)
    if args.script:
        raw = Path(args.script).expanduser().read_text(encoding="utf-8")
        blocks, speakers = build_blocks(raw, max_words, args.min_words, args.lines)
        sentences = flatten(blocks)
        timestamps, sentence_ends, last_end = sentence_times_from_words(
            sentences, result["words"], args.lead_in, allow_intro)
    else:
        print("  geen --script: de transcriptie wordt de tekst")
        blocks, speakers = build_blocks(result["text"], max_words, args.min_words)
        sentences = flatten(blocks)
        timestamps, sentence_ends, last_end = sentence_times_from_words(
            sentences, result["words"], args.lead_in, allow_intro)
        # Transcripties zijn vaak één lap tekst. Alinea's komen uit
        # paragraphise_blocks (in write_story); --split-on-pauses gebruikt
        # echte stiltes als extra signaal.
        if args.split_on_pauses:
            blocks = blocks_from_pauses(
                sentences, timestamps, args.paragraph_gap, sentence_ends)

    if args.max_duration:
        blocks, timestamps, audio_end = trim_to_sentence_boundary(
            blocks, timestamps, sentence_ends, args.max_duration)
        print("Audio opnieuw knippen op zinsgrens")
        prepare_audio(audio, dest, args.start, audio_end)
        duration = probe_duration(dest) or audio_end
    else:
        duration = probe_duration(dest) or (last_end + 1)

    sentences = flatten(blocks)
    langs = parse_csv(args.translations)
    print("Vertalen")
    translation_sets = translate_all(sentences, args.language, langs)

    print("Wegschrijven")
    level, attribution, rights = story_metadata(args)
    blocks = paragraphise_blocks(blocks)
    write_story(args.slug, args.heading, args.language,
                resolve_type(args.type, speakers), blocks, translation_sets,
                build_titles(args), voice_entry(args, timestamps, duration),
                args.order, args.publish, speakers, level, attribution, rights,
                getattr(args, "kind", None))
    report(args.slug, blocks, timestamps, translation_sets, duration)


def cmd_from_text(args):
    raw = Path(args.text).expanduser().read_text(encoding="utf-8")
    max_words = args.max_words if args.max_words > 0 else 10 ** 6
    blocks, speakers = build_blocks(raw, max_words, args.min_words, args.lines)
    sentences = flatten(blocks)

    # Precies deze tekst gaat naar de API, zodat de character-timings kloppen.
    full_text = "\n\n".join(" ".join(b["sentences"]) for b in blocks)

    print("Audio genereren")
    audio_bytes, alignment = tts(full_text, args.eleven_voice, args.model, args.language)
    dest = REPO / "audio" / args.slug / args.language / f"{args.voice_id}.mp3"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(audio_bytes)
    print(f"  {dest.relative_to(REPO)} ({len(audio_bytes)/1024:.0f} KB)")

    timestamps, last_end = sentence_times_from_chars(sentences, full_text, alignment, args.lead_in)
    duration = probe_duration(dest) or last_end

    langs = parse_csv(args.translations)
    print("Vertalen")
    translation_sets = translate_all(sentences, args.language, langs)

    print("Wegschrijven")
    level, attribution, rights = story_metadata(args)
    blocks = paragraphise_blocks(blocks)
    write_story(args.slug, args.heading, args.language,
                resolve_type(args.type, speakers), blocks, translation_sets,
                build_titles(args), voice_entry(args, timestamps, duration),
                args.order, args.publish, speakers, level, attribution, rights,
                getattr(args, "kind", None))
    report(args.slug, blocks, timestamps, translation_sets, duration)


def resegment_story(slug, max_words, min_words):
    """Pas halfzinsplitsing toe op een bestaand verhaal en schrijf de JSON terug."""
    story_dir = REPO / "stories" / slug
    story_json = story_dir / "story.json"
    if not story_json.exists():
        sys.exit(f"Geen verhaal '{slug}' in stories/")

    meta = json.loads(story_json.read_text(encoding="utf-8"))
    language = meta["language"]
    text_path = story_dir / "text" / f"{language}.json"
    text = json.loads(text_path.read_text(encoding="utf-8"))
    blocks = text["blocks"]
    old_count = len(flatten(blocks))

    translation_paths = sorted((story_dir / "translations").glob("*.json"))
    translation_docs = [json.loads(p.read_text(encoding="utf-8")) for p in translation_paths]
    translation_lists = [doc.get("sentences", []) for doc in translation_docs]

    voices = meta.get("voices") or []
    timestamps_lists = [list(voice.get("timestamps") or []) for voice in voices]
    if not timestamps_lists:
        timestamps_lists = [[]]
    duration = 0.0
    for voice, ts in zip(voices, timestamps_lists):
        duration = max(duration, float(voice.get("duration") or (ts[-1] + 5 if ts else 0)))

    new_blocks, new_ts, split_map = resegment_blocks(
        blocks, timestamps_lists, duration, max_words, min_words)
    new_count = len(flatten(new_blocks))
    if new_count == old_count:
        print(f"{slug}: {old_count} zinnen, geen extra splitsing")
        return False

    langs = [p.stem for p in translation_paths]
    sentences = flatten(new_blocks)
    print("Vertalen")
    translation_sets = refresh_translations(
        sentences, split_map, translation_lists, language, langs, min_words)

    text["blocks"] = paragraphise_blocks(new_blocks)
    write_json(text_path, text)
    for path, doc in zip(translation_paths, translation_docs):
        doc["sentences"] = translation_sets[path.stem]
        write_json(path, doc)
    for voice, ts in zip(voices, new_ts):
        voice["timestamps"] = ts
    write_json(story_json, meta)
    print(f"{slug}: {old_count} → {new_count} zinnen")
    return True


def retranslate_story(slug, langs=None):
    """Vertaal alle segmenten opnieuw per halfzin via DeepL."""
    story_dir = REPO / "stories" / slug
    story_json = story_dir / "story.json"
    if not story_json.exists():
        sys.exit(f"Geen verhaal '{slug}' in stories/")

    meta = json.loads(story_json.read_text(encoding="utf-8"))
    language = meta["language"]
    text_path = story_dir / "text" / f"{language}.json"
    text = json.loads(text_path.read_text(encoding="utf-8"))
    sentences = flatten(text["blocks"])
    count = len(sentences)

    translation_paths = sorted((story_dir / "translations").glob("*.json"))
    if langs:
        wanted = set(langs)
        translation_paths = [p for p in translation_paths if p.stem in wanted]
    if not translation_paths:
        sys.exit(f"Geen vertaalbestanden voor '{slug}'")

    split_map = [(s, [s]) for s in sentences]
    translation_docs = [json.loads(p.read_text(encoding="utf-8")) for p in translation_paths]
    translation_lists = [doc.get("sentences", []) for doc in translation_docs]
    target_langs = [p.stem for p in translation_paths]

    print(f"{slug}: {count} segmenten → {', '.join(target_langs)}")
    print("Vertalen")
    translation_sets = refresh_translations(
        sentences, split_map, translation_lists, language, target_langs, min_words=4)

    for path, doc in zip(translation_paths, translation_docs):
        doc["sentences"] = translation_sets[path.stem]
        if len(doc["sentences"]) != count:
            sys.exit(f"{path.name}: {len(doc['sentences'])} vertalingen voor {count} zinnen")
        write_json(path, doc)
    print(f"{slug}: klaar")
    return True


def cmd_retranslate(args):
    langs = parse_csv(args.translations) if args.translations else None
    slugs = ([args.slug] if args.slug
             else [p.parent.name for p in sorted((REPO / "stories").glob("*/story.json"))])
    done = 0
    for slug in slugs:
        if retranslate_story(slug, langs):
            done += 1
    print(f"\n{done}/{len(slugs)} verhaal(en) opnieuw vertaald")


def cmd_resegment(args):
    max_words = args.max_words if args.max_words > 0 else 10 ** 6
    slugs = ([args.slug] if args.slug
             else [p.parent.name for p in sorted((REPO / "stories").glob("*/story.json"))])
    changed = 0
    for slug in slugs:
        if resegment_story(slug, max_words, args.min_words):
            changed += 1
    print(f"\n{changed}/{len(slugs)} verhaal(en) aangepast")


def reparagraph_story(slug):
    """Splits te lange blocks in alinea's; zinnen, vertalingen en timestamps blijven."""
    story_dir = REPO / "stories" / slug
    story_json = story_dir / "story.json"
    if not story_json.exists():
        sys.exit(f"Geen verhaal '{slug}' in stories/")

    meta = json.loads(story_json.read_text(encoding="utf-8"))
    language = meta["language"]
    text_path = story_dir / "text" / f"{language}.json"
    text = json.loads(text_path.read_text(encoding="utf-8"))
    old_blocks = text["blocks"]
    new_blocks = paragraphise_blocks(old_blocks)
    if new_blocks == old_blocks:
        print(f"{slug}: {len(old_blocks)} alinea's, ongewijzigd")
        return False
    if flatten(new_blocks) != flatten(old_blocks):
        sys.exit(f"{slug}: alinea-splitsing veranderde de zinsvolgorde")
    text["blocks"] = new_blocks
    write_json(text_path, text)
    print(f"{slug}: {len(old_blocks)} → {len(new_blocks)} alinea's")
    return True


def cmd_reparagraph(args):
    slugs = ([args.slug] if args.slug
             else [p.parent.name for p in sorted((REPO / "stories").glob("*/story.json"))])
    changed = 0
    for slug in slugs:
        if reparagraph_story(slug):
            changed += 1
    print(f"\n{changed}/{len(slugs)} verhaal(en) in alinea's geknipt")


def cmd_add_voice(args):
    """Extra stem bij een bestaand verhaal: tekst en vertalingen blijven zoals ze zijn."""
    story_dir = REPO / "stories" / args.slug
    meta = json.loads((story_dir / "story.json").read_text())
    language = meta["language"]
    blocks = json.loads((story_dir / "text" / f"{language}.json").read_text())["blocks"]
    sentences = flatten(blocks)

    audio = Path(args.audio).expanduser()
    dest = REPO / "audio" / meta["id"] / language / f"{args.voice_id}.mp3"
    print("Audio klaarzetten")
    prepare_audio(audio, dest, args.start, args.duration)

    print("Transcriberen")
    result = scribe(dest, language, args.cache)
    allow_intro = getattr(args, 'allow_intro', False)
    timestamps, sentence_ends, last_end = sentence_times_from_words(
        sentences, result["words"], args.lead_in, allow_intro)
    duration = probe_duration(dest) or (last_end + 1)

    meta["voices"] = [v for v in meta["voices"] if v["id"] != args.voice_id]
    meta["voices"].append(voice_entry(args, timestamps, duration))
    write_json(story_dir / "story.json", meta)

    translations = json.loads((story_dir / "translations" / "en.json").read_text())["sentences"]
    report(args.slug, blocks, timestamps, translations, duration)


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("from-audio", help="bestaande opname transcriberen en aligneren")
    add_common(p)
    p.add_argument("--audio", required=True)
    p.add_argument("--script", help="tekstbestand met het exacte script (sterk aanbevolen)")
    p.add_argument("--heading", required=True, help="titel in de brontaal")
    p.add_argument("--start", type=float, help="knip vanaf deze seconde")
    p.add_argument("--duration", type=float, help="knip zoveel seconden (eindlengte zonder --max-duration)")
    p.add_argument("--clip-duration", type=float,
                   help="eerste knip voor alignment; gebruik met --max-duration")
    p.add_argument("--max-duration", type=float,
                   help="eindlengte in seconden, afgekapt op een zinsgrens")
    p.add_argument("--paragraph-gap", type=float, default=1.4,
                   help="stilte voor nieuwe alinea bij --split-on-pauses")
    p.add_argument("--split-on-pauses", action="store_true",
                   help="splits alinea's op stilte tussen zinnen (aanvulling op tekstalinea's)")
    p.add_argument("--cache", help="bewaar/hergebruik de Scribe-respons")
    p.set_defaults(func=cmd_from_audio)

    p = sub.add_parser("from-text", help="tekst laten voorlezen door ElevenLabs")
    add_common(p)
    p.add_argument("--text", required=True, help="tekstbestand, lege regels scheiden alinea's")
    p.add_argument("--heading", required=True)
    p.add_argument("--eleven-voice", required=True, help="ElevenLabs voice_id")
    p.add_argument("--model", default="eleven_flash_v2_5",
                   help="eleven_flash_v2_5, eleven_turbo_v2_5 of eleven_v3")
    p.set_defaults(func=cmd_from_text)

    p = sub.add_parser("add-voice", help="extra stem bij een bestaand verhaal")
    p.add_argument("--slug", required=True)
    p.add_argument("--audio", required=True)
    p.add_argument("--voice-id", required=True)
    p.add_argument("--voice-name")
    p.add_argument("--dialect")
    p.add_argument("--start", type=float)
    p.add_argument("--duration", type=float)
    p.add_argument("--lead-in", type=float, default=LEAD_IN)
    p.add_argument("--cache")
    p.set_defaults(func=cmd_add_voice)

    p = sub.add_parser("check", help="valideer alle verhalen")
    p.set_defaults(func=lambda a: sys.exit(check_stories()))

    p = sub.add_parser("resegment",
                       help="knip bestaande verhalen in 2–3 halfzinnen")
    p.add_argument("--slug", help="één verhaal; zonder dit argument alle verhalen")
    p.add_argument("--max-words", type=int, default=16,
                   help="langer wordt in 2–3 halfzinnen gesplitst (0 = nooit)")
    p.add_argument("--min-words", type=int, default=4)
    p.set_defaults(func=cmd_resegment)

    p = sub.add_parser("retranslate",
                       help="vertaal alle segmenten opnieuw per halfzin (DeepL)")
    p.add_argument("--slug", help="één verhaal; zonder dit argument alle verhalen")
    p.add_argument("--translations", help="kommagescheiden doeltalen (bijv. nl,en); standaard alle")
    p.set_defaults(func=cmd_retranslate)

    p = sub.add_parser("reparagraph",
                       help="knip te lange beurten in alinea's")
    p.add_argument("--slug", help="één verhaal; zonder dit argument alle verhalen")
    p.set_defaults(func=cmd_reparagraph)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
