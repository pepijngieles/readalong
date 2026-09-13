#!/usr/bin/env python3
"""Convert a Lucide icon SVG into Readalong icon_definitions() PHP snippets.

Source: https://lucide.dev (MIT). Icons are vendored into assets/icons.php — not loaded at runtime.

Usage:
  python3 tools/lucide_icon.py heart
  python3 tools/lucide_icon.py heart --name heart-filled --style fill
  python3 tools/lucide_icon.py circle-check --name circle-check
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.request

LUCIDE_RAW = "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/{name}.svg"
STROKE_TAGS = frozenset({"path", "circle", "rect", "line", "polyline", "polygon"})


def fetch_lucide(name: str) -> str:
    url = LUCIDE_RAW.format(name=name)
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8")


def parse_svg(svg: str) -> tuple[str, list[tuple[str, dict[str, str]]]]:
    viewbox = "0 0 24 24"
    viewbox_match = re.search(r'viewBox="([^"]+)"', svg)
    if viewbox_match:
        viewbox = viewbox_match.group(1)

    elements: list[tuple[str, dict[str, str]]] = []
    for match in re.finditer(r"<(path|circle|rect|line|polyline|polygon)\b([^/>]*)/?>", svg):
        tag = match.group(1)
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', match.group(2)))
        for key in (
            "stroke",
            "fill",
            "stroke-width",
            "stroke-linecap",
            "stroke-linejoin",
            "xmlns",
        ):
            attrs.pop(key, None)
        elements.append((tag, attrs))

    if not elements:
        raise ValueError("No SVG shapes found")

    return viewbox, elements


def element_class(tag: str, attrs: dict[str, str], style: str) -> str:
    if style == "fill":
        return "fill"

    if style == "dots":
        return "fill"

    if tag == "circle" and attrs.get("r") in {"1", "1.5"}:
        return "fill"

    if tag == "rect" and style == "solid":
        return ""

    return "no-fill round"


def render_body(elements: list[tuple[str, dict[str, str]]], style: str) -> str:
    parts: list[str] = []
    for tag, attrs in elements:
        cls = element_class(tag, attrs, style)
        attr_bits = [f'{key}="{value}"' for key, value in sorted(attrs.items()) if key != "class"]
        if cls:
            attr_bits.append(f'class="{cls}"')
        parts.append(f"<{tag} {' '.join(attr_bits)}/>")
    return "".join(parts)


def to_php(name: str, viewbox: str, body: str) -> str:
    body_escaped = body.replace("'", "\\'")
    return (
        f"    '{name}' => [\n"
        f"      'viewBox' => '{viewbox}',\n"
        f"      'body' => '{body_escaped}',\n"
        f"    ],"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lucide", help="Lucide icon name (kebab-case), e.g. circle-check")
    parser.add_argument("--name", help="Readalong icon key (defaults to lucide name)")
    parser.add_argument(
        "--style",
        choices=("stroke", "fill", "dots"),
        default="stroke",
        help="stroke (default), fill (solid paths), or dots (filled circles)",
    )
    args = parser.parse_args()

    icon_name = args.name or args.lucide
    svg = fetch_lucide(args.lucide)
    viewbox, elements = parse_svg(svg)
    body = render_body(elements, args.style)
    print(to_php(icon_name, viewbox, body))
    return 0


if __name__ == "__main__":
    sys.exit(main())
