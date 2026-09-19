#!/usr/bin/env python3
"""Download LibriVox audio (Verzameld Nederlands) and extract Dutch source text."""

import html
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urljoin, urlparse

REPO = Path(__file__).resolve().parent.parent
CACHE = REPO / "tools" / "cache" / "nl"

BUNDLE_002 = "https://archive.org/download/verzameld_nederlands_002_1102_librivox/"
BUNDLE_001 = "https://archive.org/download/verzameld_nederlands_001_0905/"

STORIES = [
    {
        "slug": "rontgenstralen-lorentz",
        "heading": "Röntgenstralen",
        "title_en": "X-rays",
        "level": "B2-C1",
        "kind": "book",
        "topic": "science",
        "order": 1,
        "bundle": BUNDLE_002,
        "audio": "nederlandsecollectie002_01_rontgenlorentz_as.mp3",
        "text": {"type": "dbnl_page", "url": "https://www.dbnl.org/tekst/_gid001189601_01/_gid001189601_01_0030.php"},
        "voice_id": "anna-simon",
        "voice_name": "Anna Simon",
        "attribution_title": "Röntgenstralen — H.A. Lorentz (LibriVox / Verzameld Nederlands 002)",
        "attribution_url": BUNDLE_002,
        "rights_text_source": "DBNL / H.A. Lorentz (publiek domein)",
        "rights_text_url": "https://www.dbnl.org/tekst/_gid001189601_01/_gid001189601_01_0030.php",
        "rights_audio_reader": "Anna Simon (LibriVox)",
        "rights_audio_url": BUNDLE_002,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "gezondheid-en-ziekte-eijkman",
        "heading": "Gezondheid en ziekte in heete gewesten",
        "title_en": "Health and disease in hot countries",
        "level": "B2-C1",
        "kind": "book",
        "topic": "science",
        "order": 2,
        "bundle": BUNDLE_002,
        "audio": "nederlandsecollectie002_07_redeeijkman_as.mp3",
        "text": {"type": "dbnl_work", "url": "https://www.dbnl.org/tekst/eijk010over01_01/"},
        "voice_id": "anna-simon",
        "voice_name": "Anna Simon",
        "attribution_title": "Gezondheid en ziekte in heete gewesten — C. Eijkman (LibriVox)",
        "attribution_url": BUNDLE_002,
        "rights_text_source": "DBNL / C. Eijkman (publiek domein)",
        "rights_text_url": "https://www.dbnl.org/tekst/eijk010over01_01/",
        "rights_audio_reader": "Anna Simon (LibriVox)",
        "rights_audio_url": BUNDLE_002,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "tien-uren-op-jacht",
        "heading": "Tien Uren op Jacht",
        "title_en": "Ten hours hunting",
        "level": "B1-B2",
        "kind": "book",
        "topic": "fiction",
        "order": 3,
        "bundle": BUNDLE_002,
        "audio": "nederlandsecollectie002_09_tienurenopjacht_bdl.mp3",
        "text": {
            "type": "gutenberg",
            "id": 27397,
            "start": "TIEN UREN OP JACHT.",
            "end": "End of Project Gutenberg",
        },
        "voice_id": "bart-de-leeuw",
        "voice_name": "Bart de Leeuw",
        "attribution_title": "Tien Uren op Jacht — Jules Verne (LibriVox)",
        "attribution_url": "https://www.gutenberg.org/ebooks/27397",
        "rights_text_source": "Project Gutenberg / Jules Verne (publiek domein)",
        "rights_text_url": "https://www.gutenberg.org/ebooks/27397",
        "rights_audio_reader": "Bart de Leeuw (LibriVox)",
        "rights_audio_url": BUNDLE_002,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "een-misdaad",
        "heading": "Een Misdaad",
        "title_en": "A crime",
        "level": "B2-C1",
        "kind": "book",
        "topic": "fiction",
        "order": 4,
        "bundle": BUNDLE_002,
        "audio": "nederlandsecollectie002_06_misdaad_bdl.mp3",
        "text": {
            "type": "dbnl_page",
            "url": "https://www.dbnl.org/tekst/zuyl009laat01_01/zuyl009laat01_01_0019.htm",
        },
        "voice_id": "bart-de-leeuw",
        "voice_name": "Bart de Leeuw",
        "attribution_title": "Laatste levensberichten — Marcellus Emants (LibriVox)",
        "attribution_url": BUNDLE_002,
        "rights_text_source": "DBNL / Marcellus Emants (publiek domein)",
        "rights_text_url": "https://www.dbnl.org/tekst/zuyl009laat01_01/zuyl009laat01_01_0019.htm",
        "rights_audio_reader": "Bart de Leeuw (LibriVox)",
        "rights_audio_url": BUNDLE_002,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "de-laatste-eer-aan-een-overledene",
        "heading": "De Laatste Eer aan een Overledene",
        "title_en": "Last respects to the deceased",
        "level": "B2-C1",
        "kind": "book",
        "topic": "fiction",
        "order": 5,
        "bundle": BUNDLE_002,
        "audio": "nederlandsecollectie002_04_laatsteeeraaneenoverledene_mc.mp3",
        "text": {
            "type": "dbnl_page",
            "url": "https://www.dbnl.org/tekst/nets002stud01_01/nets002stud01_01_0002.php",
        },
        "voice_id": "marcel-coenders",
        "voice_name": "Marcel Coenders",
        "attribution_title": "Studiën — Jacques Netscher (LibriVox)",
        "attribution_url": BUNDLE_002,
        "rights_text_source": "DBNL / Jacques Netscher (publiek domein)",
        "rights_text_url": "https://www.dbnl.org/tekst/nets002stud01_01/nets002stud01_01_0002.php",
        "rights_audio_reader": "Marcel Coenders (LibriVox)",
        "rights_audio_url": BUNDLE_002,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "mijnheer-prikkebeen",
        "heading": "Mijnheer Prikkebeen",
        "title_en": "Mr Prikkebeen",
        "level": "B1-B2",
        "kind": "book",
        "topic": "fiction",
        "order": 6,
        "bundle": BUNDLE_002,
        "audio": "nederlandsecollectie002_08_prikkebeen_bdl.mp3",
        "text": {"type": "dbnl_work", "url": "https://www.dbnl.org/tekst/goev001reiz01_01/"},
        "voice_id": "bart-de-leeuw",
        "voice_name": "Bart de Leeuw",
        "attribution_title": "Reizen en avonturen van mijnheer Prikkebeen — J.J.A. Goeverneur (LibriVox)",
        "attribution_url": BUNDLE_002,
        "rights_text_source": "DBNL / J.J.A. Goeverneur (publiek domein)",
        "rights_text_url": "https://www.dbnl.org/tekst/goev001reiz01_01/",
        "rights_audio_reader": "Bart de Leeuw (LibriVox)",
        "rights_audio_url": BUNDLE_002,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
        "allow_intro": True,
        "no_script": True,
    },
    {
        "slug": "krakatau-en-de-straat-soenda",
        "heading": "Krakatau en de Straat Soenda",
        "title_en": "Krakatoa and the Sunda Strait",
        "level": "B2-C1",
        "kind": "book",
        "topic": "history",
        "order": 7,
        "bundle": BUNDLE_001,
        "audio": "nederlandsecollectie001_krakatauenstraatsoenda_eep.mp3",
        "text": {
            "type": "gutenberg",
            "id": 15038,
            "end": "End of Project Gutenberg",
        },
        "voice_id": "ernst-pattynama",
        "voice_name": "Ernst Pattynama",
        "attribution_title": "Krakatau en de Straat Soenda (LibriVox / Verzameld Nederlands 001)",
        "attribution_url": BUNDLE_001,
        "rights_text_source": "Project Gutenberg (publiek domein)",
        "rights_text_url": "https://www.gutenberg.org/files/15038",
        "rights_audio_reader": "Ernst Pattynama (LibriVox)",
        "rights_audio_url": BUNDLE_001,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "fabriekskinderen",
        "heading": "Fabriekskinderen",
        "title_en": "Factory children",
        "level": "B2-C1",
        "kind": "book",
        "topic": "history",
        "order": 8,
        "bundle": BUNDLE_001,
        "audio": "nederlandsecollectie001_fabriekskinderen_mc.mp3",
        "text": {
            "type": "dbnl_work",
            "url": "https://www.dbnl.org/tekst/crem001fabr01_01/index.htm",
        },
        "voice_id": "marcel-coenders",
        "voice_name": "Marcel Coenders",
        "attribution_title": "Fabriekskinderen — J. Cremer (LibriVox)",
        "attribution_url": BUNDLE_001,
        "rights_text_source": "DBNL / J. Cremer (publiek domein)",
        "rights_text_url": "https://www.dbnl.org/tekst/crem001fabr01_01/index.htm",
        "rights_audio_reader": "Marcel Coenders (LibriVox)",
        "rights_audio_url": BUNDLE_001,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "van-dagen-en-seizoenen",
        "heading": "Van Dagen en seizoenen",
        "title_en": "Of days and seasons",
        "level": "B2-C1",
        "kind": "book",
        "topic": "fiction",
        "order": 9,
        "bundle": BUNDLE_001,
        "audio": "nederlandsecollectie001_dagenseizoenen_cj.mp3",
        "text": {
            "type": "wikisource",
            "url": "https://nl.wikisource.org/wiki/Couperus/Van_dagen_en_seizoenen",
        },
        "voice_id": "carola-janssen",
        "voice_name": "Carola Janssen",
        "attribution_title": "Van dagen en seizoenen — Louis Couperus (LibriVox)",
        "attribution_url": BUNDLE_001,
        "rights_text_source": "Wikisource / Louis Couperus (publiek domein)",
        "rights_text_url": "https://nl.wikisource.org/wiki/Couperus/Van_dagen_en_seizoenen",
        "rights_audio_reader": "Carola Janssen (LibriVox)",
        "rights_audio_url": BUNDLE_001,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "de-brave-hendrik",
        "heading": "De Brave Hendrik",
        "title_en": "Brave Hendrik",
        "level": "B1-B2",
        "kind": "book",
        "topic": "fiction",
        "order": 10,
        "bundle": BUNDLE_001,
        "audio": "nederlandsecollectie001_bravehendrik_mc.mp3",
        "text": {"type": "dbnl_work", "url": "https://dbnl.org/tekst/ansl002brav01_01/"},
        "voice_id": "marcel-coenders",
        "voice_name": "Marcel Coenders",
        "attribution_title": "De Brave Hendrik — A.C.W. Insinger-Anslijn (LibriVox)",
        "attribution_url": BUNDLE_001,
        "rights_text_source": "DBNL / A.C.W. Insinger-Anslijn (publiek domein)",
        "rights_text_url": "https://dbnl.org/tekst/ansl002brav01_01/",
        "rights_audio_reader": "Marcel Coenders (LibriVox)",
        "rights_audio_url": BUNDLE_001,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "het-krabbetje-en-de-gerechtigheid",
        "heading": "Het Krabbetje en de Gerechtigheid",
        "title_en": "The little crab and Justice",
        "level": "B2-C1",
        "kind": "book",
        "topic": "fiction",
        "order": 11,
        "bundle": BUNDLE_001,
        "audio": "nederlandsecollectie001_krabbetje_bdl.mp3",
        "text": {
            "type": "dbnl_page",
            "url": "https://www.dbnl.org/tekst/_nie002nieu02_01/_nie002nieu02_01_0009.htm",
        },
        "voice_id": "bart-de-leeuw",
        "voice_name": "Bart de Leeuw",
        "attribution_title": "Het Krabbetje en de Gerechtigheid — Frederik van Eeden (LibriVox)",
        "attribution_url": BUNDLE_001,
        "rights_text_source": "DBNL / Frederik van Eeden (publiek domein)",
        "rights_text_url": "https://www.dbnl.org/tekst/_nie002nieu02_01/_nie002nieu02_01_0009.htm",
        "rights_audio_reader": "Bart de Leeuw (LibriVox)",
        "rights_audio_url": BUNDLE_001,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
    {
        "slug": "zedelijke-opvoeding",
        "heading": "Zedelijke opvoeding",
        "title_en": "Moral education",
        "level": "B1-B2",
        "kind": "book",
        "topic": "fiction",
        "order": 12,
        "bundle": BUNDLE_001,
        "audio": "nederlandsecollectie001_zedelijkeopvoeding_mc.mp3.mp3",
        "text": {
            "type": "dbnl_page",
            "url": "https://www.dbnl.org/tekst/ligt002vers01_01/ligt002vers01_01_0014.php",
        },
        "voice_id": "marcel-coenders",
        "voice_name": "Marcel Coenders",
        "attribution_title": "Zedelijke opvoeding — Jan Ligthart (LibriVox)",
        "attribution_url": BUNDLE_001,
        "rights_text_source": "DBNL / Jan Ligthart (publiek domein)",
        "rights_text_url": "https://www.dbnl.org/tekst/ligt002vers01_01/",
        "rights_audio_reader": "Marcel Coenders (LibriVox)",
        "rights_audio_url": BUNDLE_001,
        "rights_audio_license": "Public domain",
        "rights_text_license": "Public domain",
    },
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Readalong/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        return resp.read()


def decode(data: bytes) -> str:
    for enc in ("utf-8", "iso-8859-1", "windows-1252"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def strip_tags(text: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalise_quotes(text: str) -> str:
    return (
        text.replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
    )


def extract_dbnl_paragraphs(page: str) -> list[str]:
    match = re.search(r'<article id="content">(.*?)</article>', page, re.I | re.S)
    if not match:
        sys.exit("DBNL: geen <article id=content> gevonden")
    block = match.group(1)
    parts = []
    for match_p in re.finditer(r"<p[^>]*>(.*?)</p>", block, re.I | re.S):
        if "copyright" in match_p.group(0).lower():
            continue
        chunk = normalise_quotes(strip_tags(match_p.group(1)))
        if chunk and chunk not in {"*", "—"}:
            parts.append(chunk)
    if not parts:
        verse = []
        for match_l in re.finditer(
            r'<div class="line-content">(.*?)</div>', block, re.I | re.S
        ):
            chunk = normalise_quotes(strip_tags(match_l.group(1)))
            if chunk and not chunk.startswith("[pagina"):
                verse.append(chunk)
        if verse:
            parts.append(" ".join(verse))
    return parts


def extract_dbnl_page(url: str) -> str:
    page = decode(fetch(url))
    parts = extract_dbnl_paragraphs(page)
    if not parts:
        sys.exit(f"DBNL: geen alinea's op {url}")
    return "\n\n".join(parts)


def dbnl_chapter_links(work_url: str, page: str) -> list[str]:
    base = work_url if work_url.endswith("/") else work_url.rsplit("/", 1)[0] + "/"
    links = []
    for match in re.finditer(
        r'href="([^"]+\.(?:php|htm))"[^>]*class="head3"',
        page,
        re.I,
    ):
        href = match.group(1)
        if "tpg" in href or "index" in href:
            continue
        links.append(urljoin(base, href))
    if links:
        return links
    for match in re.finditer(r'href="([^"]+_\d{4}\.(?:php|htm))"', page, re.I):
        href = match.group(1)
        if "tpg" in href:
            continue
        links.append(urljoin(base, href))
    seen = set()
    ordered = []
    for link in links:
        if link not in seen:
            seen.add(link)
            ordered.append(link)
    return ordered


def extract_dbnl_work(url: str) -> str:
    page = decode(fetch(url))
    chapters = dbnl_chapter_links(url, page)
    if not chapters:
        parts = extract_dbnl_paragraphs(page)
        if parts:
            return "\n\n".join(parts)
        sys.exit(f"DBNL: geen hoofdstukken op {url}")
    all_parts = []
    for chapter_url in chapters:
        chapter_page = decode(fetch(chapter_url))
        all_parts.extend(extract_dbnl_paragraphs(chapter_page))
    return "\n\n".join(all_parts)


def extract_gutenberg(book_id: int, start: str | None = None, end: str | None = None) -> str:
    urls = [
        f"https://www.gutenberg.org/cache/epub/{book_id}/pg{book_id}.txt",
        f"https://www.gutenberg.org/files/{book_id}/{book_id}-0.txt",
        f"https://www.gutenberg.org/files/{book_id}/{book_id}.txt",
    ]
    raw = None
    for url in urls:
        try:
            raw = decode(fetch(url))
            break
        except urllib.error.HTTPError:
            continue
    if raw is None:
        sys.exit(f"Gutenberg {book_id}: tekstbestand niet gevonden")
    lines = []
    started = False
    for line in raw.splitlines():
        if re.match(r"\*\*\* START OF", line):
            started = True
            continue
        if re.match(r"\*\*\* END OF", line):
            break
        if started:
            lines.append(line.rstrip())
    body = "\n".join(lines).strip()
    if not body:
        body = raw
    body = re.sub(r"\n{3,}", "\n\n", body)
    body = normalise_quotes(body)
    if start:
        idx = body.find(start)
        if idx < 0:
            sys.exit(f"Gutenberg {book_id}: startmarkering niet gevonden: {start!r}")
        body = body[idx:]
    if end:
        idx = body.find(end)
        if idx >= 0:
            body = body[:idx]
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return body


def extract_wikisource(url: str) -> str:
    page = decode(fetch(url))
    match = re.search(
        r'<div class="mw-content-ltr mw-parser-output"[^>]*>(.*?)</div>\s*<!--',
        page,
        re.I | re.S,
    )
    if not match:
        match = re.search(
            r'<div class="mw-content-ltr mw-parser-output"[^>]*>(.*)',
            page,
            re.I | re.S,
        )
    if not match:
        sys.exit(f"Wikisource: geen parser-output op {url}")
    block = match.group(1)
    parts = []
    for match_p in re.finditer(r"<p[^>]*>(.*?)</p>", block, re.I | re.S):
        chunk = normalise_quotes(strip_tags(match_p.group(1)))
        if not chunk or chunk.startswith("Overgenomen"):
            continue
        if chunk.startswith("Deze pagina"):
            continue
        parts.append(chunk)
    if not parts:
        sys.exit(f"Wikisource: geen alinea's op {url}")
    return "\n\n".join(parts)


def extract_text(spec: dict) -> str:
    kind = spec["type"]
    if kind == "dbnl_page":
        return extract_dbnl_page(spec["url"])
    if kind == "dbnl_work":
        return extract_dbnl_work(spec["url"])
    if kind == "gutenberg":
        return extract_gutenberg(spec["id"], spec.get("start"), spec.get("end"))
    if kind == "wikisource":
        return extract_wikisource(spec["url"])
    sys.exit(f"Onbekend teksttype: {kind}")


def story_by_slug(slug: str | None):
    if slug:
        for story in STORIES:
            if story["slug"] == slug:
                return story
        sys.exit(f"Onbekende slug: {slug}")
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
        audio_url = story["bundle"] + story["audio"]
        print(f"{slug}: audio", end=" ", flush=True)
        if not audio_path.exists():
            audio_path.write_bytes(fetch(audio_url))
            print("downloaded")
        else:
            print("cached")
        print(f"{slug}: text", end=" ", flush=True)
        script_path.write_text(extract_text(story["text"]) + "\n", encoding="utf-8")
        print(f"written ({script_path.stat().st_size} bytes)")


if __name__ == "__main__":
    download_sources(sys.argv[1] if len(sys.argv) > 1 else None)
