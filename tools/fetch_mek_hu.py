#!/usr/bin/env python3
"""Download MEK audio and extract Hungarian source text for Readalong stories."""

import html
import re
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CACHE = REPO / "tools" / "cache" / "hu"
MEK = "https://mek.oszk.hu"

STORIES = [
    {
        "slug": "a-kis-szurke-ember",
        "heading": "A kis szürke ember",
        "title_en": "The little grey man",
        "title_nl": "De kleine grijze man",
        "level": "B2-C1",
        "kind": "book",
        "topic": "history",
        "audio": f"{MEK}/02300/02359/mp3/2562af08.mp3",
        "text": {"type": "jokai_rd", "url": f"{MEK}/00700/00799/html/jokai23.htm"},
        "voice_id": "szoboszlai-eva",
        "voice_name": "Szoboszlai Éva",
        "attribution_title": "Forradalmi és csataképek — Jókai Mór",
        "attribution_url": f"{MEK}/00700/00799/",
        "rights_text_source": "MEK / Jókai Mór (public domain)",
        "rights_audio_reader": "Szoboszlai Éva (MVGYOSZ)",
        "rights_audio_url": f"{MEK}/02300/02359/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "nomen-et-omen",
        "heading": "Nomen et omen",
        "title_en": "Nomen et omen",
        "title_nl": "Nomen et omen",
        "level": "B2-C1",
        "kind": "book",
        "topic": "history",
        "audio": f"{MEK}/02300/02359/mp3/2562af09.mp3",
        "text": {"type": "jokai_rd", "url": f"{MEK}/00700/00799/html/jokai24.htm"},
        "voice_id": "szoboszlai-eva",
        "voice_name": "Szoboszlai Éva",
        "attribution_title": "Forradalmi és csataképek — Jókai Mór",
        "attribution_url": f"{MEK}/00700/00799/",
        "rights_text_source": "MEK / Jókai Mór (public domain)",
        "rights_audio_reader": "Szoboszlai Éva (MVGYOSZ)",
        "rights_audio_url": f"{MEK}/02300/02359/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "a-szerencsetlen-szelkakas",
        "heading": "A szerencsétlen szélkakas",
        "title_en": "The unfortunate weathercock",
        "title_nl": "De ongelukkige windhaan",
        "level": "B2-C1",
        "kind": "book",
        "topic": "history",
        "audio": f"{MEK}/02300/02359/mp3/2562af11.mp3",
        "text": {"type": "jokai_rd", "url": f"{MEK}/00700/00799/html/jokai26.htm"},
        "voice_id": "szoboszlai-eva",
        "voice_name": "Szoboszlai Éva",
        "attribution_title": "Forradalmi és csataképek — Jókai Mór",
        "attribution_url": f"{MEK}/00700/00799/",
        "rights_text_source": "MEK / Jókai Mór (public domain)",
        "rights_audio_reader": "Szoboszlai Éva (MVGYOSZ)",
        "rights_audio_url": f"{MEK}/02300/02359/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "a-feher-angyal",
        "heading": "A fehér angyal",
        "title_en": "The white angel",
        "title_nl": "De witte engel",
        "level": "B2-C1",
        "kind": "book",
        "topic": "history",
        "audio": f"{MEK}/02300/02359/mp3/2562af07.mp3",
        "text": {"type": "jokai_rd", "url": f"{MEK}/00700/00799/html/jokai22.htm"},
        "voice_id": "szoboszlai-eva",
        "voice_name": "Szoboszlai Éva",
        "attribution_title": "Forradalmi és csataképek — Jókai Mór",
        "attribution_url": f"{MEK}/00700/00799/",
        "rights_text_source": "MEK / Jókai Mór (public domain)",
        "rights_audio_reader": "Szoboszlai Éva (MVGYOSZ)",
        "rights_audio_url": f"{MEK}/02300/02359/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "egy-bal",
        "heading": "Egy bál",
        "title_en": "A ball",
        "title_nl": "Een bal",
        "level": "B2-C1",
        "kind": "book",
        "topic": "history",
        "audio": f"{MEK}/02300/02359/mp3/2562af01.mp3",
        "text": {"type": "jokai_rd", "url": f"{MEK}/00700/00799/html/jokai3.htm"},
        "voice_id": "szoboszlai-eva",
        "voice_name": "Szoboszlai Éva",
        "attribution_title": "Forradalmi és csataképek — Jókai Mór",
        "attribution_url": f"{MEK}/00700/00799/",
        "rights_text_source": "MEK / Jókai Mór (public domain)",
        "rights_audio_reader": "Szoboszlai Éva (MVGYOSZ)",
        "rights_audio_url": f"{MEK}/02300/02359/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "az-ezermester-es-a-kozak",
        "heading": "Az ezermester és a kozák",
        "title_en": "The master craftsman and the Cossack",
        "title_nl": "De meester en de Kozak",
        "level": "B2-C1",
        "kind": "book",
        "topic": "history",
        "audio": f"{MEK}/02300/02359/mp3/2562af13_04.mp3",
        "text": {"type": "jokai_rd", "url": f"{MEK}/00800/00801/html/jokai4.htm"},
        "voice_id": "szoboszlai-eva",
        "voice_name": "Szoboszlai Éva",
        "attribution_title": "Egy bujdosó naplója — Jókai Mór",
        "attribution_url": f"{MEK}/00800/00801/",
        "rights_text_source": "MEK / Jókai Mór (public domain)",
        "rights_audio_reader": "Szoboszlai Éva (MVGYOSZ)",
        "rights_audio_url": f"{MEK}/02300/02359/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "magyar-dolgozat",
        "heading": "Magyar dolgozat",
        "title_en": "Hungarian essay",
        "title_nl": "Hongaars werkstuk",
        "level": "B1-B2",
        "kind": "book",
        "topic": "fiction",
        "audio": f"{MEK}/19100/19144/mp3/08-Karinthy-Frigyes-Tanar-ur-kerem.mp3",
        "text": {"type": "karinthy", "url": f"{MEK}/00700/00719/00719.htm", "start": "8", "end": "11"},
        "voice_id": "bakonyi-orsolya",
        "voice_name": "Bakonyi Orsolya",
        "attribution_title": "Tanár úr kérem — Karinthy Frigyes",
        "attribution_url": f"{MEK}/19100/19144/",
        "rights_text_source": "MEK / Karinthy Frigyes (public domain)",
        "rights_audio_reader": "Bakonyi Orsolya",
        "rights_audio_recorded": "2019",
        "rights_audio_url": f"{MEK}/19100/19144/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "a-rossz-tanulo-felel",
        "heading": "A rossz tanuló felel",
        "title_en": "The bad student answers",
        "title_nl": "De slechte leerling antwoordt",
        "level": "B1-B2",
        "kind": "book",
        "topic": "fiction",
        "audio": f"{MEK}/19100/19144/mp3/06-Karinthy-Frigyes-Tanar-ur-kerem.mp3",
        "text": {"type": "karinthy", "url": f"{MEK}/00700/00719/00719.htm", "start": "6", "end": "7"},
        "voice_id": "bakonyi-orsolya",
        "voice_name": "Bakonyi Orsolya",
        "attribution_title": "Tanár úr kérem — Karinthy Frigyes",
        "attribution_url": f"{MEK}/19100/19144/",
        "rights_text_source": "MEK / Karinthy Frigyes (public domain)",
        "rights_audio_reader": "Bakonyi Orsolya",
        "rights_audio_recorded": "2019",
        "rights_audio_url": f"{MEK}/19100/19144/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "a-vesztanacs",
        "heading": "A vésztanács",
        "title_en": "The council of doom",
        "title_nl": "De noodraad",
        "level": "B1-B2",
        "kind": "book",
        "topic": "fiction",
        "audio": f"{MEK}/19100/19144/mp3/15-Karinthy-Frigyes-Tanar-ur-kerem.mp3",
        "text": {"type": "karinthy", "url": f"{MEK}/00700/00719/00719.htm", "start": "17", "end": "18"},
        "voice_id": "bakonyi-orsolya",
        "voice_name": "Bakonyi Orsolya",
        "attribution_title": "Tanár úr kérem — Karinthy Frigyes",
        "attribution_url": f"{MEK}/19100/19144/",
        "rights_text_source": "MEK / Karinthy Frigyes (public domain)",
        "rights_audio_reader": "Bakonyi Orsolya",
        "rights_audio_recorded": "2019",
        "rights_audio_url": f"{MEK}/19100/19144/",
        "rights_audio_license": "Public domain",
    },
    {
        "slug": "az-elrontott-regeny",
        "heading": "Az elrontott regény",
        "title_en": "The ruined novel",
        "title_nl": "De mislukte roman",
        "level": "B2-C1",
        "kind": "book",
        "topic": "biography",
        "audio": f"{MEK}/02300/02387/mp3/2589af06.mp3",
        "text": {"type": "mikszath", "url": f"{MEK}/00900/00945/html/01.htm", "start": "7", "end": "8"},
        "voice_id": "papp-janos",
        "voice_name": "Papp János",
        "attribution_title": "Jókai Mór élete és kora — Mikszáth Kálmán",
        "attribution_url": f"{MEK}/02300/02387/",
        "rights_text_source": "MEK / Mikszáth Kálmán (public domain)",
        "rights_audio_reader": "Papp János (MVGYOSZ)",
        "rights_audio_url": f"{MEK}/02300/02387/",
        "rights_audio_license": "Public domain",
    },
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Readalong/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def decode(data: bytes) -> str:
    for enc in ("utf-8", "iso-8859-2", "windows-1250"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def strip_tags(text: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_jokai_rd(page: str) -> str:
    parts = []
    for match in re.finditer(r'<p class="rd"[^>]*>(.*?)</p>', page, re.I | re.S):
        chunk = strip_tags(match.group(1))
        if chunk and chunk != "*":
            parts.append(chunk)
    return "\n\n".join(parts)


def extract_karinthy(page: str, start: str, end: str) -> str:
    anchor = rf'<a name=["\']?{re.escape(start)}["\']?>'
    nxt = rf'<a name=["\']?{re.escape(end)}["\']?>'
    match = re.search(rf"{anchor}(.*?){nxt}", page, re.I | re.S)
    if not match:
        sys.exit(f"Karinthy section #{start} not found")
    block = match.group(1)
    parts = []
    for match_p in re.finditer(r"<P[^>]*>(.*?)</P>", block, re.I | re.S):
        chunk = strip_tags(match_p.group(1))
        if chunk and not re.match(r"^[IVXLC\d]+\.?\s*$", chunk):
            parts.append(chunk)
    return "\n\n".join(parts)


def extract_mikszath(page: str, start: str, end: str) -> str:
    pattern = (
        rf'<a name=["\']?{re.escape(start)}["\']?>(.*?)'
        rf'<a name=["\']?{re.escape(end)}["\']?>'
    )
    match = re.search(pattern, page, re.I | re.S)
    if not match:
        sys.exit(f"Mikszáth section #{start} not found")
    parts = []
    for match_p in re.finditer(r"<p[^>]*>(.*?)</p>", match.group(1), re.I | re.S):
        chunk = strip_tags(match_p.group(1))
        if chunk:
            parts.append(chunk)
    return "\n\n".join(parts)


def extract_text(spec: dict) -> str:
    page = decode(fetch(spec["url"]))
    kind = spec["type"]
    if kind == "jokai_rd":
        return extract_jokai_rd(page)
    if kind == "karinthy":
        return extract_karinthy(page, spec["start"], spec["end"])
    if kind == "mikszath":
        return extract_mikszath(page, spec["start"], spec["end"])
    sys.exit(f"Unknown text type: {kind}")


def story_by_slug(slug: str | None):
    if slug:
        for story in STORIES:
            if story["slug"] == slug:
                return story
        sys.exit(f"Unknown slug: {slug}")
    return None


def download_sources(slug: str | None = None):
    CACHE.mkdir(parents=True, exist_ok=True)
    stories = [story_by_slug(slug)] if slug else STORIES
    for story in stories:
        if story is None:
            continue
        slug = story["slug"]
        audio_path = CACHE / f"{slug}.mp3"
        script_path = CACHE / f"{slug}.txt"
        print(f"{slug}: audio", end=" ", flush=True)
        if not audio_path.exists():
            audio_path.write_bytes(fetch(story["audio"]))
            print("downloaded")
        else:
            print("cached")
        print(f"{slug}: text", end=" ", flush=True)
        script_path.write_text(extract_text(story["text"]) + "\n", encoding="utf-8")
        print(f"written ({script_path.stat().st_size} bytes)")


if __name__ == "__main__":
    download_sources(sys.argv[1] if len(sys.argv) > 1 else None)
