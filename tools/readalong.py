#!/usr/bin/env python3
"""readalong.py — bouw een compleet verhaal voor de Readalong-site.

Schrijft de drie JSON-bestanden die assets/story.php verwacht, plus de
index.php-stub en de mp3 op de juiste plek. Twee bronnen, dezelfde uitvoer:

  from-audio   bestaande opname  -> Scribe transcribeert/aligneert -> timestamps
  from-text    bestaande tekst   -> ElevenLabs TTS -> audio + timestamps
  add-voice    extra stem bij een bestaand verhaal (tekst blijft ongewijzigd)
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
# Woorden waar een halfzin natuurlijk mag beginnen (Noors + Nederlands).
CONJUNCTIONS = {
    "og", "men", "som", "fordi", "at", "når", "hvis", "så", "eller", "mens",
    "der", "for", "siden", "selv", "enn", "da", "maar", "omdat", "terwijl",
    "want", "dus", "toen", "als", "hoewel", "zodat",
}

# De handmatig afgestemde timestamps in de bestaande verhalen liggen niet op
# het eerste woord, maar in de stilte ervoor. Gemeten over de 61 zinnen van
# two-frogs en favorite-food geeft 0.6s de kleinste afwijking: mediaan 0.1s,
# p90 0.5s, maximaal 1.0s.
LEAD_IN = 0.6

# Licenties die geen extra toestemming vereisen voor publicatie.
FREE_LICENSE_HINTS = (
    "public domain", "publiek domein", "cc0", "cc-by", "creative commons",
)


def parse_csv(value):
    return [part.strip() for part in value.split(",") if part.strip()]


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
    """Splits een alinea op zinseinden, met respect voor afkortingen."""
    sentences, current = [], []
    for token in paragraph.split():
        current.append(token)
        if not SENTENCE_END.search(token):
            continue
        if token.lower() in ABBREVIATIONS or re.fullmatch(r"[A-ZÆØÅ]\.", token):
            continue
        sentences.append(" ".join(current))
        current = []
    if current:
        sentences.append(" ".join(current))
    return sentences


def split_long(words, max_words, min_words):
    """Hak een te lange zin op bij komma's of voegwoorden, anders bij het midden."""
    if len(words) <= max_words:
        return [words]

    candidates = []
    for i, w in enumerate(words):
        if i < min_words or len(words) - i < min_words:
            continue
        if CLAUSE_END.search(w):
            candidates.append((i + 1, 0))          # breek ná de komma
        elif normalise_word(w) in CONJUNCTIONS:
            candidates.append((i, 1))              # breek vóór het voegwoord

    if not candidates:
        mid = len(words) // 2
        return [words[:mid], words[mid:]]

    # Prioriteit: voorkeur voor komma's boven voegwoorden (lagere priority = beter)
    # en splits zo dicht mogelijk bij het midden, maar maak kleinere stukken
    # als dat beter leesbaar is
    target = len(words) / 2
    
    # Als de zin erg lang is (>1.5x max), probeer dan dichter bij 1/3 of 2/3 te splitsen
    # voor betere leesbaarheid
    if len(words) > max_words * 1.5:
        # Zoek het eerste goede split-punt na min_words dat tot twee behapbare delen leidt
        for idx, priority in sorted(candidates, key=lambda c: (c[1], c[0])):
            if idx >= min_words and len(words) - idx >= min_words:
                return (split_long(words[:idx], max_words, min_words)
                        + split_long(words[idx:], max_words, min_words))
    
    # Anders, splits dicht bij het midden
    idx, _ = min(candidates, key=lambda c: (c[1], abs(c[0] - target)))
    return (split_long(words[:idx], max_words, min_words)
            + split_long(words[idx:], max_words, min_words))


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
        parts = []
        candidates = [text] if literal_lines else split_sentences(text)
        for sentence in candidates:
            for chunk in split_long(sentence.split(), max_words, min_words):
                if chunk:
                    parts.append(" ".join(chunk))
        return parts

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


def blocks_from_pauses(sentences, timestamps, gap_threshold):
    """Zonder script kennen we geen alinea's; leid ze af uit de lange stiltes."""
    blocks, current = [], []
    for i, sentence in enumerate(sentences):
        gap = timestamps[i] - timestamps[i - 1] if i else 0.0
        if current and i and gap > gap_threshold:
            blocks.append({"sentences": current})
            current = []
        current.append(sentence)
    if current:
        blocks.append({"sentences": current})
    return blocks


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
                voice, order=None, published=False, speakers=None, source=None):
    story_dir = REPO / "stories" / slug
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
    if source:
        meta["source"] = source
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

        source = meta.get("source")
        if source and source.get("license"):
            lic = source["license"].lower()
            if not any(hint in lic for hint in FREE_LICENSE_HINTS):
                issues.append(f"bron: '{source['license']}' — controleer toestemming vóór publicatie")

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


def build_source(args):
    if not getattr(args, "source_title", None):
        return None
    source = {"title": args.source_title}
    if getattr(args, "source_author", None):
        source["author"] = args.source_author
    if getattr(args, "source_url", None):
        source["url"] = args.source_url
    if getattr(args, "source_license", None):
        source["license"] = args.source_license
    if getattr(args, "source_note", None):
        source["note"] = args.source_note
    return source


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
    parser.add_argument("--order", type=int, help="sorteerpositie op de startpagina")
    parser.add_argument("--publish", action="store_true", help="zet published op true")
    parser.add_argument("--lead-in", type=float, default=LEAD_IN,
                        help=f"seconden voor het eerste woord (default {LEAD_IN})")
    parser.add_argument("--allow-intro", action="store_true",
                        help="laat de eerste zin op zijn natuurlijke tijd beginnen (handig voor intro-audio)")
    parser.add_argument("--max-words", type=int, default=16,
                        help="langer wordt in halfzinnen gesplitst (0 = nooit)")
    parser.add_argument("--min-words", type=int, default=4)
    parser.add_argument("--lines", action="store_true",
                        help="elke regel is precies één segment in plaats van "
                             "automatisch op zinseinden splitsen")
    parser.add_argument("--translations", default="en",
                        help="komma-gescheiden vertaaltalen (default en)")
    parser.add_argument("--title", help="titel in de standaardvertaling (default: heading)")
    parser.add_argument("--title-nl", help="Nederlandse titel voor translations/nl.json")
    parser.add_argument("--title-en", help="Engelse titel voor translations/en.json")
    parser.add_argument("--source-title", help="titel van het bronmateriaal")
    parser.add_argument("--source-author", help="maker van het bronmateriaal")
    parser.add_argument("--source-url", help="link naar het bronmateriaal")
    parser.add_argument("--source-license", help="licentie van het bronmateriaal")
    parser.add_argument("--source-note", help="extra opmerking bij de bron")


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
        # Eén alinea per block in de UI; zonder script alles in één <p> tenzij
        # --split-on-pauses (pauzes zijn in leer-podcasts te kort om op te splitsen).
        if args.split_on_pauses:
            blocks = blocks_from_pauses(sentences, timestamps, args.paragraph_gap)
        else:
            blocks = [{"sentences": sentences}]

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
    write_story(args.slug, args.heading, args.language,
                resolve_type(args.type, speakers), blocks, translation_sets,
                build_titles(args), voice_entry(args, timestamps, duration),
                args.order, args.publish, speakers, build_source(args))
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
    write_story(args.slug, args.heading, args.language,
                resolve_type(args.type, speakers), blocks, translation_sets,
                build_titles(args), voice_entry(args, timestamps, duration),
                args.order, args.publish, speakers, build_source(args))
    report(args.slug, blocks, timestamps, translation_sets, duration)


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
                   help="splits alinea's op stilte (standaard: alles in één alinea)")
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

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
