#!/usr/bin/env python3
"""Deterministic, idempotent SEO fixes for levashou.pl (Tasks 1-3 + broken links).

This is the 'postprocessor' the spec sanctions for a no-build static site.
Re-running it is a no-op (idempotent). Run: python3 scripts/seo_apply.py
"""
import re, datetime
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://levashou.pl"
TODAY = "2026-06-01"
HOMEPAGE = {"index.html", "index-pl.html"}
SKIP_PREFIXES = (".git/", "scripts/", "booking-api/", "_design_system_unpacked/")
IGNORE_FILES = {"practice-premium-demo.html", "practice-premium-3d-demo.html", "_darkpreview.html"}

def rel_for_href(href: str):
    h = href.split("#")[0].split("?")[0]
    if h.startswith(ORIGIN):
        h = h[len(ORIGIN):]
    if h.startswith("/"):
        h = h[1:]
    if h == "" or h.endswith("/"):
        h = h + "index.html"
    return h

def content_pages():
    for f in sorted(ROOT.rglob("*.html")):
        rel = str(f.relative_to(ROOT)).replace("\\", "/")
        if rel.startswith(SKIP_PREFIXES) or "node_modules/" in rel or f.name in IGNORE_FILES:
            continue
        yield f, rel

NOINDEX = [
    "topics/anxiety.html", "topics/trauma.html", "topics/depression.html",
    "topics/burnout.html", "topics/emigration.html",
    "topics-pl/lek.html", "topics-pl/trauma.html", "topics-pl/depresja.html",
    "topics-pl/wypalenie.html", "topics-pl/emigracja.html",
    "intro.html", "intro-pl.html",
]
PL_RE = re.compile(r"(^|/)(blog-pl|topics-pl|tests-pl|practices-pl|library-pl)/|-pl\.html$|/index-pl\.html$|/intro-pl\.html$")
LINK_FIXES = [
    ('"/terms.html"', '"/regulamin.html"'),
    ('"/blog/grief.html"', '"/grief.html"'),
    ('"/glossary/gaslighting.html"', '"/blog/gaslighting.html"'),
    ('"/glossary-pl/gaslighting.html"', '"/blog-pl/gaslighting.html"'),
]
changes = []

# ---- Task 1: noindex on 12 ----
VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
ROBOTS = '<meta name="robots" content="noindex, follow">'
for rel in NOINDEX:
    f = ROOT / rel
    t = f.read_text(encoding="utf-8")
    if 'name="robots"' in t:
        continue
    if VIEWPORT in t:
        t = t.replace(VIEWPORT, VIEWPORT + "\n" + ROBOTS, 1)
    else:  # fallback: after <head>
        t = re.sub(r"(<head>)", r"\1\n" + ROBOTS, t, count=1)
    f.write_text(t, encoding="utf-8")
    changes.append(f"noindex: {rel}")

# ---- Task 2: hreflang upsert on every page (idempotent) ----
HL_LINE = re.compile(r'[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n')

def detect_pair(soup, page_rel):
    """Return (ru_url, pl_url) from the language switcher, or None if no real pair."""
    ru = pl = None
    for a in soup.select(".lang-mobile a, .lang-switch a"):
        h = (a.get("href") or "").split("#")[0]
        if not h:
            continue
        if PL_RE.search(h):
            pl = h
        else:
            ru = h
    if not (ru and pl):
        return None
    ru_rel, pl_rel = rel_for_href(ru), rel_for_href(pl)
    home_self = page_rel in HOMEPAGE
    # a non-homepage page that "pairs" with the homepage is really unpaired
    if not home_self and (ru_rel in HOMEPAGE or pl_rel in HOMEPAGE):
        return None
    if not ((ROOT / ru_rel).is_file() and (ROOT / pl_rel).is_file()):
        return None
    def url_of(r):
        return ORIGIN + "/" if r == "index.html" else ORIGIN + "/" + r
    return url_of(ru_rel), url_of(pl_rel)

def desired_block(ru_url, pl_url):
    return ("".join([
        f'<link rel="alternate" hreflang="ru" href="{ru_url}">\n',
        f'<link rel="alternate" hreflang="pl" href="{pl_url}">\n',
        f'<link rel="alternate" hreflang="x-default" href="{ru_url}">\n',
    ]))

for f, rel in content_pages():
    t = f.read_text(encoding="utf-8")
    soup = BeautifulSoup(t, "lxml")
    pair = detect_pair(soup, rel)
    stripped = HL_LINE.sub("", t)
    if pair is None:
        if stripped != t:
            f.write_text(stripped, encoding="utf-8")
            changes.append(f"strip-hreflang (unpaired): {rel}")
        continue
    ru_url, pl_url = pair
    block = desired_block(ru_url, pl_url)
    # insert after canonical link, else after viewport
    if '<link rel="canonical"' in stripped:
        new = re.sub(r'(<link rel="canonical"[^>]*>\n)', r"\1" + block, stripped, count=1)
    elif VIEWPORT in stripped:
        new = stripped.replace(VIEWPORT, VIEWPORT + "\n" + block.rstrip("\n"), 1)
    else:
        new = stripped
    if new != t:
        f.write_text(new, encoding="utf-8")
        changes.append(f"hreflang-upsert: {rel}")

# ---- broken-link repoints (blog + blog-pl) ----
for f in sorted(list((ROOT / "blog").glob("*.html")) + list((ROOT / "blog-pl").glob("*.html"))):
    t = f.read_text(encoding="utf-8")
    o = t
    for a, b in LINK_FIXES:
        t = t.replace(a, b)
    if t != o:
        f.write_text(t, encoding="utf-8")
        changes.append(f"link-fix: {f.relative_to(ROOT)}")

# ---- Task 3: sitemap (remove 12 noindex urls, clamp future lastmod) ----
sm = ROOT / "sitemap.xml"
text = sm.read_text(encoding="utf-8")
# remove <url> blocks whose <loc> is a noindex url
def block_is_noindex(block):
    return any(f"/{rel}<" in block for rel in NOINDEX)
blocks = re.split(r"(?=<url>)", text)
kept = []
removed = 0
for b in blocks:
    if b.strip().startswith("<url>") and block_is_noindex(b):
        removed += 1
        continue
    kept.append(b)
text = "".join(kept)
# clamp future lastmod to TODAY
def clamp(m):
    d = m.group(1)
    try:
        if datetime.date.fromisoformat(d) > datetime.date.fromisoformat(TODAY):
            return f"<lastmod>{TODAY}</lastmod>"
    except ValueError:
        pass
    return m.group(0)
n_before = text.count("<lastmod>")
text2 = re.sub(r"<lastmod>([0-9-]+)</lastmod>", clamp, text)
sm.write_text(text2, encoding="utf-8")
changes.append(f"sitemap: removed {removed} noindex urls, clamped future lastmod")

print(f"applied {len(changes)} change-groups:")
for c in changes:
    print("  -", c)
