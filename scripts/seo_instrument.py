#!/usr/bin/env python3
"""Idempotent instrumentation of blog posts (Tasks 4 + 6): breadcrumb / related / cta-landing.

Regex-based string edits (no bs4 round-trip) to preserve hand-written formatting.
Re-running is a no-op. Run: python3 scripts/seo_instrument.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS = [p for p in sorted(list((ROOT/"blog").glob("*.html")) + list((ROOT/"blog-pl").glob("*.html")))
         if p.name != "index.html"]

# short hub labels for breadcrumb crumb #2
HUB_LABEL = {
    "topics/anxiety.html": "Тревога и паника", "topics/trauma.html": "Травма и ПТСР",
    "topics/depression.html": "Депрессия и сон", "topics/burnout.html": "Выгорание",
    "topics/relationships.html": "Отношения", "topics/self-esteem.html": "Самооценка",
    "topics/emigration.html": "Эмиграция",
    "topics-pl/lek.html": "Lęk i panika", "topics-pl/trauma.html": "Trauma i PTSD",
    "topics-pl/depresja.html": "Depresja i sen", "topics-pl/wypalenie.html": "Wypalenie",
    "topics-pl/relacje.html": "Relacje", "topics-pl/samoocena.html": "Samoocena",
    "topics-pl/emigracja.html": "Emigracja",
}

# reverse-lookup: which hub links each post (first hub wins)
hub_of = {}
for hf in sorted(list((ROOT/"topics").glob("*.html")) + list((ROOT/"topics-pl").glob("*.html"))):
    if hf.name == "index.html":
        continue
    rel = str(hf.relative_to(ROOT)).replace("\\", "/")
    t = hf.read_text(encoding="utf-8")
    for m in re.finditer(r'href="(/blog(?:-pl)?/[a-z0-9-]+\.html)"', t):
        hub_of.setdefault(m.group(1).lstrip("/"), rel)

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

changes = []
for f in POSTS:
    rel = str(f.relative_to(ROOT)).replace("\\", "/")
    t = f.read_text(encoding="utf-8")
    orig = t
    is_pl = rel.startswith("blog-pl/")

    # 1) related marker
    if '<aside class="related-articles">' in t and 'data-seo="related"' not in t:
        t = t.replace('<aside class="related-articles">',
                      '<aside class="related-articles" data-seo="related">', 1)

    # 2) cta-landing marker on first /intro link
    if 'data-seo="cta-landing"' not in t:
        t = re.sub(r'(<a\b[^>]*\bhref="/intro(?:-pl)?\.html")',
                   r'\1 data-seo="cta-landing"', t, count=1)

    # 3) breadcrumb after post-back, if absent
    if 'data-seo="breadcrumb"' not in t:
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", t, re.S)
        title = re.sub(r"<[^>]+>", "", h1.group(1)).strip() if h1 else ""
        title = re.sub(r"\s+", " ", title)
        hub = hub_of.get(rel)
        if hub:
            crumb2 = f'<a href="/{hub}">{HUB_LABEL.get(hub, "Тема")}</a>'
        else:
            crumb2 = ('<a href="/blog-pl.html">Blog</a>' if is_pl else '<a href="/blog.html">Блог</a>')
        home = ('<a href="/index-pl.html">Strona główna</a>' if is_pl
                else '<a href="/">Главная</a>')
        label = "Okruszki" if is_pl else "Хлебные крошки"
        bc = (f'\n  <nav class="breadcrumbs" data-seo="breadcrumb" aria-label="{label}">'
              f'<div class="container">{home} <span class="sep">→</span> {crumb2}'
              f' <span class="sep">→</span> <span aria-current="page">{esc(title)}</span>'
              f'</div></nav>')
        t = re.sub(r'(class="post-back">[^<]*</a>)', r'\1' + bc, t, count=1)

    if t != orig:
        f.write_text(t, encoding="utf-8")
        changes.append(rel)

print(f"instrumented {len(changes)} posts")
