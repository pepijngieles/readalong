#!/usr/bin/env python3
"""WCAG contrast audit for Readalong CSS color tokens."""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from math import pow
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STYLES = ROOT / "assets" / "styles.css"

THEMES = ["light", "cream", "dark", "black"]

PAIRS = [
    ("text-primary", "background-primary", "body text", 4.5),
    ("text-secondary", "background-primary", "links/body", 4.5),
    ("text-tertiary", "background-primary", "labels", 4.5),
    ("text-yellow", "background-yellow", "settings checked segment", 4.5),
    ("text-on-yellow", "background-yellow", "primary button", 4.5),
    ("text-velvet", "background-velvet", "velvet info block", 4.5),
    ("text-link-visited", "background-primary", "visited links", 4.5),
    ("settings-label-muted", "background-popover", "settings slider labels", 4.5),
    ("icon-default", "background-primary", "icons", 3.0),
    ("icon-accent", "background-primary", "play/pause icon", 3.0),
    ("focus-outline", "background-primary", "focus ring", 3.0),
    ("focus-outline", "background-popover", "focus on popover", 3.0),
    ("progress-fill", "background-primary", "progress bar fill", 3.0),
]


@dataclass
class Color:
    r: float
    g: float
    b: float
    a: float = 1.0

    def blend_on(self, bg: "Color") -> "Color":
        if self.a >= 1:
            return Color(self.r, self.g, self.b, 1.0)
        return Color(
            self.r * self.a + bg.r * (1 - self.a),
            self.g * self.a + bg.g * (1 - self.a),
            self.b * self.a + bg.b * (1 - self.a),
            1.0,
        )


def parse_hex(value: str) -> Color:
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return Color(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def parse_rgb(value: str) -> Color:
    nums = [float(x.strip()) for x in value.split(",")]
    r, g, b = nums[:3]
    a = nums[3] if len(nums) > 3 else 1.0
    return Color(r, g, b, a)


def rel_lum(c: Color) -> float:
    def channel(x: float) -> float:
        x /= 255
        return x / 12.92 if x <= 0.03928 else pow((x + 0.055) / 1.055, 2.4)

    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)


def contrast(fg: Color, bg: Color) -> float:
    fg = fg.blend_on(bg)
    l1, l2 = rel_lum(fg), rel_lum(bg)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)


def parse_css_tokens(css: str) -> dict[str, dict[str, str]]:
    scopes: dict[str, dict[str, str]] = {":root": {}}
    selector_parts: list[str] = []
    current_keys: list[str] = [":root"]

    for raw_line in css.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("/*"):
            continue

        if line.startswith("body.theme-") or line.startswith(":root"):
            if "{" in line:
                head = line.split("{", 1)[0].strip()
                selector_parts.extend(part.strip() for part in head.split(",") if part.strip())
                current_keys = selector_parts or [":root"]
                selector_parts = []
                for key in current_keys:
                    scopes.setdefault(key, {})
                continue

            part = line.rstrip(",").strip()
            if part:
                selector_parts.append(part)
            continue

        match = re.match(r"--([a-z0-9-]+):\s*(.+?);", line)
        if match and current_keys:
            for key in current_keys:
                scopes.setdefault(key, {})[match.group(1)] = match.group(2).strip()

    return scopes


def resolve(token: str, scopes: dict[str, dict[str, str]], theme: str, seen: set[str] | None = None) -> Color:
    seen = seen or set()
    if token in seen:
        raise ValueError(f"circular token reference: {token}")
    seen.add(token)

    value = scopes[":root"].get(token, "")
    if theme != "light":
        selector = f"body.theme-{theme}"
        if selector in scopes and token in scopes[selector]:
            value = scopes[selector][token]

    if value.startswith("var("):
        inner = value[4:-1].split(",")[0].strip().lstrip("-")
        return resolve(inner, scopes, theme, seen)

    if value.startswith("#"):
        return parse_hex(value)
    if value.startswith("rgba("):
        return parse_rgb(value[5:-1])
    if value.startswith("rgb("):
        c = parse_rgb(value[4:-1])
        c.a = 1.0
        return c

    raise ValueError(f"unsupported token value for --{token}: {value}")


def main() -> int:
    css = STYLES.read_text(encoding="utf-8")
    scopes = parse_css_tokens(css)
    failures = []

    for theme in THEMES:
        print(f"=== {theme.upper()} ===")
        for fg_name, bg_name, label, min_ratio in PAIRS:
            try:
                fg = resolve(fg_name, scopes, theme)
                bg = resolve(bg_name, scopes, theme)
                ratio = contrast(fg, bg)
            except (ValueError, KeyError) as err:
                print(f"  SKIP {label}: {err}")
                continue
            ok = ratio >= min_ratio
            status = "OK" if ok else "FAIL"
            print(f"  {label:32} {ratio:5.2f}  [{status}]  (--{fg_name} on --{bg_name})")
            if not ok:
                failures.append((theme, label, ratio, min_ratio))
        print()

    if failures:
        print(f"{len(failures)} contrast failure(s):")
        for theme, label, ratio, min_ratio in failures:
            print(f"  - {theme}: {label} = {ratio:.2f} (needs {min_ratio})")
        return 1

    print("All checked pairs pass WCAG thresholds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
