#!/usr/bin/env python3
"""Fast-follow: give the 51 hub-less posts a correct parent WITHOUT creating new hubs.

Buckets: methods -> /metody.html(-pl); reassign -> one of the 7 topic hubs; outlier -> blog.
Writes scripts/seo-orphan-map.json. Idempotent. Run: python3 scripts/seo_orphan.py
Order: run after seo_apply.py + seo_instrument.py.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# hub_key -> {ru:(parent_rel,label), pl:(parent_rel,label)}
HUB = {
    "metody":        {"ru": ("metody.html", "Методы"),                 "pl": ("metody-pl.html", "Metody")},
    "relationships": {"ru": ("topics/relationships.html", "Отношения"), "pl": ("topics-pl/relacje.html", "Relacje")},
    "trauma":        {"ru": ("topics/trauma.html", "Травма и ПТСР"),    "pl": ("topics-pl/trauma.html", "Trauma i PTSD")},
    "anxiety":       {"ru": ("topics/anxiety.html", "Тревога и паника"),"pl": ("topics-pl/lek.html", "Lęk i panika")},
    "emigration":    {"ru": ("topics/emigration.html", "Эмиграция"),    "pl": ("topics-pl/emigracja.html", "Emigracja")},
    "depression":    {"ru": ("topics/depression.html", "Депрессия и сон"),"pl": ("topics-pl/depresja.html", "Depresja i sen")},
    "self-esteem":   {"ru": ("topics/self-esteem.html", "Самооценка"),  "pl": ("topics-pl/samoocena.html", "Samoocena")},
    "burnout":       {"ru": ("topics/burnout.html", "Выгорание"),       "pl": ("topics-pl/wypalenie.html", "Wypalenie")},
}

# explicit per-file classification of the 51 hub-less posts
ASSIGN = {  # bucket methods/reassign -> hub_key
    # methods
    "blog/cbt-vs-gestalt.html": "metody", "blog-pl/cbt-vs-gestalt.html": "metody",
    "blog/dbt.html": "metody", "blog-pl/terapia-dbt.html": "metody",
    "blog/schema-therapy.html": "metody", "blog-pl/terapia-schematow.html": "metody",
    "blog/what-is-psychotherapy.html": "metody", "blog-pl/ile-kosztuje-psychoterapia.html": "metody",
    "blog/online-vs-offline.html": "metody", "blog-pl/online-vs-offline.html": "metody",
    # reassign -> relationships
    "blog/attachment-styles.html": "relationships", "blog-pl/typy-przywiazania.html": "relationships",
    "blog/dda.html": "relationships", "blog-pl/dda.html": "relationships",
    "blog/manipulation.html": "relationships", "blog-pl/manipulation.html": "relationships",
    "blog-pl/syndrom-sztokholmski.html": "relationships", "blog/relationship-stages.html": "relationships",
    "blog-pl/relationship-stages.html": "relationships",
    # reassign -> trauma
    "blog/borderline.html": "trauma", "blog-pl/zaburzenie-osobowosci-borderline.html": "trauma",
    "blog/dissociation.html": "trauma", "blog-pl/dissociation.html": "trauma",
    # reassign -> anxiety
    "blog/derealization.html": "anxiety", "blog-pl/derealization.html": "anxiety",
    "blog/health-anxiety.html": "anxiety", "blog-pl/health-anxiety.html": "anxiety",
    "blog/introversion-vs-social-anxiety.html": "anxiety", "blog-pl/introversion-vs-social-anxiety.html": "anxiety",
    "blog/night-anxiety.html": "anxiety", "blog/night-waking-fear.html": "anxiety",
    "blog/panic-falling-asleep.html": "anxiety",
    "blog-pl/night-anxiety.html": "anxiety", "blog-pl/night-waking-fear.html": "anxiety",
    "blog-pl/panic-falling-asleep.html": "anxiety",
    # reassign -> emigration
    "blog/migration-burnout.html": "emigration", "blog-pl/migration-burnout.html": "emigration",
    "blog/homesickness.html": "emigration", "blog/loneliness-emigration.html": "emigration",
    "blog-pl/homesickness.html": "emigration", "blog-pl/loneliness-emigration.html": "emigration",
    # reassign -> depression
    "blog/high-functioning-depression.html": "depression", "blog-pl/high-functioning-depression.html": "depression",
    "blog/apathy.html": "depression", "blog-pl/apathy.html": "depression",
    # reassign -> self-esteem
    "blog/assertiveness.html": "self-esteem", "blog-pl/assertiveness.html": "self-esteem",
    "blog/perfectionism.html": "self-esteem", "blog-pl/perfekcjonizm.html": "self-esteem",
    "blog/how-to-love-yourself.html": "self-esteem", "blog-pl/how-to-love-yourself.html": "self-esteem",
    "blog/reflection.html": "self-esteem",  # reclassified from methods: about self-awareness
    "blog-pl/reflection.html": "self-esteem",
    # reassign -> burnout
    "blog/cynicism.html": "burnout", "blog-pl/cynicism.html": "burnout",
}
OUTLIERS = [
    "blog/adult-adhd.html", "blog-pl/adult-adhd.html",
    "blog/paranoia.html", "blog/psychosomatics.html",
    "blog-pl/paranoia.html", "blog-pl/psychosomatics.html",
    "blog/emotional-regulation.html", "blog-pl/emotional-regulation.html",
]

def lang(rel): return "pl" if rel.startswith("blog-pl/") else "ru"
def h1_of(t):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", t, re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1)).strip()) if m else ""
def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

# ---- write the orphan map (post -> {bucket, parent}) ----
omap = {}
for rel, hk in ASSIGN.items():
    bucket = "methods" if hk == "metody" else "reassign"
    parent_rel = HUB[hk][lang(rel)][0]
    omap[rel] = {"bucket": bucket, "hub": hk, "parent": parent_rel}
for rel in OUTLIERS:
    omap[rel] = {"bucket": "outlier", "hub": None, "parent": None}
(ROOT / "scripts" / "seo-orphan-map.json").write_text(json.dumps(omap, ensure_ascii=False, indent=2), encoding="utf-8")

changes = []

# ---- 1) parent pages: upsert a data-seo="hub-posts" container listing assigned posts ----
parent_posts = {}  # parent_rel -> [(post_rel, title)]
for rel, hk in ASSIGN.items():
    parent_rel = HUB[hk][lang(rel)][0]
    t = (ROOT / rel).read_text(encoding="utf-8")
    parent_posts.setdefault(parent_rel, []).append((rel, h1_of(t)))

SEC_RE = re.compile(r'\n?<section data-seo="hub-posts".*?</section>', re.S)
for parent_rel, items in parent_posts.items():
    is_pl = parent_rel.endswith("-pl.html") or "topics-pl/" in parent_rel
    label = "Więcej w temacie" if is_pl else "Ещё по теме"
    items = sorted(set(items), key=lambda x: x[1].lower())
    lis = "".join(f'<li><a href="/{p}">{esc(title)}</a></li>' for p, title in items)
    sec = (f'\n<section data-seo="hub-posts" style="padding:36px 0;border-top:1px solid var(--border-subtle);">'
           f'<div class="container"><div class="eyebrow">{label}</div>'
           f'<ul style="columns:2;column-gap:32px;margin-top:14px;padding:0;list-style:none;line-height:2;">{lis}</ul>'
           f'</div></section>')
    f = ROOT / parent_rel
    t = f.read_text(encoding="utf-8")
    if 'data-seo="hub-posts"' in t:
        new = SEC_RE.sub(sec, t, count=1)
    elif "</main>" in t:
        new = t.replace("</main>", sec + "\n</main>", 1)
    else:
        new = t.replace("<footer", sec + "\n<footer", 1)
    if new != t:
        f.write_text(new, encoding="utf-8")
        changes.append(f"hub-posts: {parent_rel} ({len(items)} links)")

# ---- 2) rebuild breadcrumb of the 45 methods+reassign posts with the right parent ----
BC_RE = re.compile(r'<nav class="breadcrumbs" data-seo="breadcrumb".*?</nav>', re.S)
for rel, hk in ASSIGN.items():
    f = ROOT / rel
    t = f.read_text(encoding="utf-8")
    parent_rel, label = HUB[hk][lang(rel)]
    is_pl = lang(rel) == "pl"
    home = ('<a href="/index-pl.html">Strona główna</a>' if is_pl else '<a href="/">Главная</a>')
    aria = "Okruszki" if is_pl else "Хлебные крошки"
    title = h1_of(t)
    bc = (f'<nav class="breadcrumbs" data-seo="breadcrumb" aria-label="{aria}"><div class="container">'
          f'{home} <span class="sep">→</span> <a href="/{parent_rel}">{label}</a>'
          f' <span class="sep">→</span> <span aria-current="page">{esc(title)}</span></div></nav>')
    new = BC_RE.sub(bc, t, count=1)
    if new != t:
        f.write_text(new, encoding="utf-8")
        changes.append(f"breadcrumb->{hk}: {rel}")

print(f"orphan map: {len(omap)} posts ({sum(1 for v in omap.values() if v['bucket']=='methods')} methods, "
      f"{sum(1 for v in omap.values() if v['bucket']=='reassign')} reassign, "
      f"{sum(1 for v in omap.values() if v['bucket']=='outlier')} outlier)")
print(f"applied {len(changes)} changes")
