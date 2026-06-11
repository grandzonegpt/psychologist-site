#!/usr/bin/env python3
"""SEO indexing audit for levashou.pl (static HTML, no build system).

Run:  python3 scripts/seo_audit.py
Exits non-zero on any FAIL. Writes seo-audit-report.json.

The audit is the source of truth for the indexing-fix pass: it encodes the
acceptance criteria and is run in a loop until it is green.
"""
import json, re, sys, datetime
from pathlib import Path
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

# ---------------- config ----------------
ORIGIN = "https://levashou.pl"
ROOT = Path(__file__).resolve().parent.parent
TODAY = datetime.date.today()

EXPECTED_NOINDEX = [
    "topics/anxiety.html", "topics/trauma.html", "topics/depression.html",
    "topics/burnout.html", "topics/emigration.html",
    "topics-pl/lek.html", "topics-pl/trauma.html", "topics-pl/depresja.html",
    "topics-pl/wypalenie.html", "topics-pl/emigracja.html",
    "intro.html", "intro-pl.html",
]
KEEP_INDEXED = [
    "topics/relationships.html", "topics/self-esteem.html",
    "topics-pl/relacje.html", "topics-pl/samoocena.html",
    "topics/index.html", "topics-pl/index.html",
]
# files to ignore entirely (untracked demos / preview artifacts)
IGNORE = {"practice-premium-demo.html", "practice-premium-3d-demo.html", "_darkpreview.html",
          "practices-design-export.html",
          "_card-demo-ru.html", "_instagram-slides-ru.html", "_reel-ru.html"}
# utility pages legitimately noindexed (thank-you / 404), not part of EXPECTED_NOINDEX
UTILITY_NOINDEX_OK = {"404.html", "spasibo.html", "dziekuje.html"}
HOMEPAGE = {"index.html", "index-pl.html"}
# directory prefixes that are not part of the public site surface
SKIP_PREFIXES = (".git/", "scripts/", "booking-api/", "_design_system_unpacked/")
# pages allowed to have no canonical (utility pages, not indexable content)
NO_CANONICAL_OK = {"404.html"}

PL_RE = re.compile(r"(^|/)(blog-pl|topics-pl|tests-pl|practices-pl|library-pl|glossary-pl)/|-pl\.html$|/index-pl\.html$|/intro-pl\.html$")

fails = []            # (check, message)
warns = []            # (check, message)
report = {}

def fail(check, msg): fails.append((check, msg))
def warn(check, msg): warns.append((check, msg))

# ---------------- url <-> path ----------------
def url_for(rel: str) -> str:
    rel = rel.replace("\\", "/")
    if rel.endswith("index.html"):
        d = rel[:-len("index.html")]
        return ORIGIN + "/" + d
    return ORIGIN + "/" + rel

def path_for_url(url: str):
    if not url.startswith(ORIGIN):
        return None
    p = url[len(ORIGIN):]
    p = p.split("#")[0].split("?")[0]
    if p.startswith("/"):
        p = p[1:]
    if p == "" or p.endswith("/"):
        p = p + "index.html"
    return p

def href_to_path(href: str, base_rel: str):
    """Resolve an <a href> to a repo-relative file path, or None if external/non-file."""
    if not href:
        return None
    h = href.split("#")[0].split("?")[0]
    if h == "" or h.startswith(("http://", "https://", "mailto:", "tel:", "//")):
        return None
    if h.startswith("/"):
        p = h[1:]
    else:  # relative
        p = str((Path(base_rel).parent / h)).replace("\\", "/")
    if p == "" or p.endswith("/"):
        p = p + "index.html"
    return p

# ---------------- collect pages ----------------
pages = {}   # rel -> dict
for f in sorted(ROOT.rglob("*.html")):
    rel = str(f.relative_to(ROOT)).replace("\\", "/")
    if any(part in IGNORE for part in [rel, f.name]):
        continue
    if rel.startswith(SKIP_PREFIXES) or "node_modules/" in rel:
        continue
    html = f.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    head = soup.head
    # robots
    robots = ""
    m = soup.find("meta", attrs={"name": "robots"})
    if m and m.get("content"):
        robots = m["content"].lower()
    # canonical
    canons = [l.get("href") for l in soup.find_all("link", rel=lambda v: v and "canonical" in v)]
    # hreflang
    hreflang = {}
    for l in soup.find_all("link", rel=lambda v: v and "alternate" in v):
        hl = l.get("hreflang")
        if hl:
            hreflang[hl.lower()] = l.get("href")
    # language switcher hrefs (pair source of truth)
    sw_hrefs = []
    for el in soup.select(".lang-mobile a, .lang-switch a"):
        if el.get("href"):
            sw_hrefs.append(el["href"])
    # meta refresh redirect?
    refresh = soup.find("meta", attrs={"http-equiv": re.compile("refresh", re.I)})
    # internal <a> links
    links = []
    for a in soup.find_all("a", href=True):
        tp = href_to_path(a["href"], rel)
        if tp is not None:
            links.append(tp)
    # data-seo markers
    seo_markers = {}
    for el in soup.select("[data-seo]"):
        key = el.get("data-seo")
        cnt = len(el.find_all("a", href=True))
        if el.name == "a" and el.get("href"):
            cnt += 1  # marker placed directly on an anchor
        seo_markers[key] = seo_markers.get(key, 0) + cnt
    bc_links = [href_to_path(a.get("href"), rel) for a in soup.select('[data-seo="breadcrumb"] a') if a.get("href")]
    hubposts_links = [href_to_path(a.get("href"), rel) for a in soup.select('[data-seo="hub-posts"] a') if a.get("href")]
    _t = soup.find("title"); _h = soup.find("h1")
    title_txt = re.sub(r"\s+", " ", _t.get_text()).strip() if _t else ""
    h1_txt = re.sub(r"\s+", " ", _h.get_text()).strip() if _h else ""
    pages[rel] = dict(
        rel=rel, url=url_for(rel), robots=robots, canonical=(canons[0] if canons else None),
        n_canon=len(canons), hreflang=hreflang, switch=sw_hrefs, refresh=bool(refresh),
        links=links, seo=seo_markers, body=soup.body,
        data_category=(soup.body.get("data-category") if soup.body else None),
        bc_links=[x for x in bc_links if x], hubposts_links=[x for x in hubposts_links if x],
        title_txt=title_txt, h1_txt=h1_txt,
    )

report["total_pages"] = len(pages)

def exists(rel): return rel in pages or (ROOT / rel).is_file()

# ---------------- [ROBOTS] ----------------
for rel in EXPECTED_NOINDEX:
    if not exists(rel):
        fail("ROBOTS", f"EXPECTED_NOINDEX file missing: {rel}")
    elif "noindex" not in pages.get(rel, {}).get("robots", ""):
        fail("ROBOTS", f"missing noindex: {rel}")
for rel in KEEP_INDEXED:
    if rel in pages and "noindex" in pages[rel]["robots"]:
        fail("ROBOTS", f"unexpected noindex on keep-page: {rel}")
unexpected_noindex = [r for r, p in pages.items()
                      if "noindex" in p["robots"] and r not in EXPECTED_NOINDEX
                      and r not in UTILITY_NOINDEX_OK]
for r in unexpected_noindex:
    fail("ROBOTS", f"unexpected noindex: {r}")
report["noindex_pages"] = sorted([r for r, p in pages.items() if "noindex" in p["robots"]])

# ---------------- [CANONICAL] ----------------
alt_canon = []
for rel, p in pages.items():
    if p["n_canon"] == 0:
        if rel not in NO_CANONICAL_OK:
            fail("CANONICAL", f"no canonical: {rel}")
    elif p["n_canon"] > 1:
        fail("CANONICAL", f"{p['n_canon']} canonicals: {rel}")
    elif p["canonical"] and p["canonical"].rstrip("/") != p["url"].rstrip("/"):
        alt_canon.append((rel, p["canonical"]))
report["alt_canonical"] = alt_canon

# ---------------- pair detection (switcher) ----------------
def detect_pair(p):
    ru = pl = None
    for h in p["switch"]:
        hp = h.split("#")[0].split("?")[0]
        if PL_RE.search(hp):
            pl = hp
        else:
            ru = hp
    if not (ru and pl):
        return None
    ru_rel, pl_rel = path_for_url(ORIGIN + ru), path_for_url(ORIGIN + pl)
    if p["rel"] not in HOMEPAGE and (ru_rel in HOMEPAGE or pl_rel in HOMEPAGE):
        return None
    if not (exists(ru_rel) and exists(pl_rel)):
        return None
    def url_of(r):
        return ORIGIN + "/" if r == "index.html" else ORIGIN + "/" + r
    return url_of(ru_rel), url_of(pl_rel)

# ---------------- [HREFLANG] ----------------
unpaired = []
for rel, p in pages.items():
    pair = detect_pair(p)
    has_hl = bool(p["hreflang"])
    if not pair:
        if has_hl:
            fail("HREFLANG", f"hreflang present but no pair detected: {rel}")
        else:
            unpaired.append(rel)
        continue
    ru_url, pl_url = pair
    ru_rel, pl_rel = path_for_url(ru_url), path_for_url(pl_url)
    if not exists(ru_rel): fail("HREFLANG", f"{rel}: ru target missing {ru_rel}")
    if not exists(pl_rel): fail("HREFLANG", f"{rel}: pl target missing {pl_rel}")
    if not has_hl:
        fail("HREFLANG", f"has pair but no hreflang: {rel}")
        continue
    for need in ("ru", "pl", "x-default"):
        if need not in p["hreflang"]:
            fail("HREFLANG", f"{rel}: missing hreflang {need}")
    def norm(u):
        u = u or ""
        if u.endswith("/index.html"): u = u[:-len("index.html")]  # /topics/index.html == /topics/
        return u.rstrip("/")
    if norm(p["hreflang"].get("ru")) != norm(ru_url):
        fail("HREFLANG", f"{rel}: hreflang ru != pair ({p['hreflang'].get('ru')} vs {ru_url})")
    if norm(p["hreflang"].get("pl")) != norm(pl_url):
        fail("HREFLANG", f"{rel}: hreflang pl != pair ({p['hreflang'].get('pl')} vs {pl_url})")
    if norm(p["hreflang"].get("x-default")) != norm(ru_url):
        fail("HREFLANG", f"{rel}: x-default != ru")
report["unpaired"] = sorted(unpaired)

# ---------------- [SITEMAP] ----------------
sm_path = ROOT / "sitemap.xml"
sm_locs = []
if not sm_path.exists():
    fail("SITEMAP", "sitemap.xml missing")
else:
    tree = ET.parse(sm_path)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    for url_el in tree.getroot().findall("s:url", ns):
        loc = url_el.findtext("s:loc", default="", namespaces=ns).strip()
        lastmod = url_el.findtext("s:lastmod", default="", namespaces=ns).strip()
        sm_locs.append(loc)
        rel = path_for_url(loc)
        if rel is None or not exists(rel):
            fail("SITEMAP", f"loc -> missing file: {loc}")
            continue
        p = pages.get(rel)
        if p:
            if "noindex" in p["robots"]:
                fail("SITEMAP", f"noindex page in sitemap: {loc}")
            if p["refresh"]:
                fail("SITEMAP", f"redirect page in sitemap: {loc}")
            if p["canonical"] and p["canonical"].rstrip("/") != p["url"].rstrip("/"):
                fail("SITEMAP", f"non-self-canonical in sitemap: {loc}")
        if not lastmod:
            fail("SITEMAP", f"no lastmod: {loc}")
        else:
            try:
                d = datetime.date.fromisoformat(lastmod)
                if d > TODAY:
                    fail("SITEMAP", f"future lastmod {lastmod}: {loc}")
            except ValueError:
                fail("SITEMAP", f"bad lastmod {lastmod}: {loc}")
    # overlap with noindex
    sm_rel = set(filter(None, (path_for_url(l) for l in sm_locs)))
    for r in EXPECTED_NOINDEX:
        if r in sm_rel:
            fail("SITEMAP", f"EXPECTED_NOINDEX still in sitemap: {r}")
report["sitemap_count"] = len(sm_locs)

# ---------------- [LINKGRAPH] ----------------
# broken internal links
broken = set()
for rel, p in pages.items():
    for tp in p["links"]:
        if tp.endswith(".html") and not exists(tp):
            broken.add((rel, tp))
for src, tp in sorted(broken):
    fail("LINKGRAPH", f"broken link {src} -> {tp}")

POSTS = [r for r in pages if (r.startswith("blog/") or r.startswith("blog-pl/")) and not r.endswith("index.html")]
report["post_count"] = len(POSTS)

# inbound from blog index
blog_index_links = set(pages.get("blog.html", {}).get("links", [])) | set(pages.get("blog-pl.html", {}).get("links", []))
for post in POSTS:
    if post not in blog_index_links:
        fail("LINKGRAPH", f"orphan: post not linked from blog index: {post}")

# data-seo markers on posts (Task 6)
for post in POSTS:
    seo = pages[post]["seo"]
    if seo.get("breadcrumb", 0) < 2:
        fail("LINKGRAPH", f"missing breadcrumb(>=2 links): {post}")
    if seo.get("related", 0) < 3:
        fail("LINKGRAPH", f"missing related(>=3 links): {post}")
    if seo.get("cta-landing", 0) < 1:
        fail("LINKGRAPH", f"missing cta-landing: {post}")

# ---------------- [THEME_MAP] ----------------
VALID_CATS = {"anxiety", "trauma", "relations", "self", "method", "practice"}
theme_map = {}
for post in POSTS:
    cat = pages[post]["data_category"]
    if not cat or cat not in VALID_CATS:
        fail("THEME_MAP", f"post without valid theme/category: {post} ({cat})")
    theme_map[post] = cat
report["theme_map_size"] = len(theme_map)

# ---------------- [PARENT] ----------------
omap_path = ROOT / "scripts" / "seo-orphan-map.json"
orphan_map = json.loads(omap_path.read_text(encoding="utf-8")) if omap_path.exists() else {}
OUTLIERS = {r for r, v in orphan_map.items() if v.get("bucket") == "outlier"}
HUB_PAGES = [r for r in pages if r.startswith(("topics/", "topics-pl/")) and not r.endswith("index.html")] \
            + [r for r in ("metody.html", "metody-pl.html") if r in pages]
parent_links = {}
for hp in HUB_PAGES:
    for tp in set(pages[hp]["links"]):
        if tp.startswith(("blog/", "blog-pl/")) and tp.endswith(".html"):
            parent_links.setdefault(tp, set()).add(hp)

for post in POSTS:
    if post in OUTLIERS:
        continue
    if post not in parent_links:
        fail("PARENT", f"no parent (hub/metody) and not OUTLIER: {post}")

def parent_expected(post):
    v = orphan_map.get(post)
    if v and v.get("parent"):
        return v["parent"]
    if post in OUTLIERS:
        return "blog-pl.html" if post.startswith("blog-pl/") else "blog.html"
    return None  # 126 existing hub posts: parent not enforced (not touched)

for post in POSTS:
    exp = parent_expected(post)
    if exp is not None and exp not in pages[post]["bc_links"]:
        fail("PARENT", f"breadcrumb parent != assigned ({exp}): {post}")

methods_posts = [r for r, v in orphan_map.items() if v.get("bucket") == "methods"]
for mp in ("metody.html", "metody-pl.html"):
    if mp in pages:
        linked = set(pages[mp]["hubposts_links"])
        for post in methods_posts:
            if (post.startswith("blog-pl/") == (mp == "metody-pl.html")) and post not in linked:
                fail("PARENT", f"{mp} hub-posts misses methods post: {post}")
for post, v in orphan_map.items():
    if v.get("bucket") == "reassign" and v["parent"] not in parent_links.get(post, set()):
        fail("PARENT", f"assigned hub does not link reassign post: {post} -> {v['parent']}")
report["orphan_buckets"] = {b: sum(1 for x in orphan_map.values() if x.get("bucket") == b)
                            for b in ("methods", "reassign", "outlier")}
report["in_hubs_already"] = len([p for p in POSTS if p in parent_links and p not in orphan_map])

# ---------------- [TITLE_H1] (warn-only: title should differ from h1) ----------------
title_h1_dup = sorted(p for p in POSTS if pages[p]["title_txt"] and pages[p]["title_txt"] == pages[p]["h1_txt"])
report["title_eq_h1"] = title_h1_dup
for p in title_h1_dup:
    warn("TITLE_H1", p)

# ---------------- summary ----------------
by_check = {}
for c, m in fails:
    by_check.setdefault(c, []).append(m)

print("\n==================  SEO AUDIT  ==================")
print(f"pages: {report['total_pages']}  posts: {report.get('post_count')}  sitemap: {report.get('sitemap_count')}")
order = ["ROBOTS", "CANONICAL", "HREFLANG", "SITEMAP", "LINKGRAPH", "THEME_MAP", "PARENT"]
for c in order:
    n = len(by_check.get(c, []))
    status = "PASS" if n == 0 else f"FAIL ({n})"
    print(f"  [{c:<10}] {status}")
    for m in by_check.get(c, [])[:8]:
        print(f"       - {m}")
    if n > 8:
        print(f"       ... +{n-8} more")
print("------------------------------------------------")
print(f"unpaired (no hreflang, ok): {len(report['unpaired'])}")
print(f"alt-canonical (review):     {len(report['alt_canonical'])}")
print(f"TOTAL FAIL: {len(fails)}   WARN: {len(warns)}")
print("================================================\n")

report["fails"] = [{"check": c, "msg": m} for c, m in fails]
report["fail_count"] = len(fails)
(ROOT / "seo-audit-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

sys.exit(1 if fails else 0)
