# SEO indexing toolkit (levashou.pl)

Static raw-HTML site, no build. These are **dev tools** (migration + audit), not part of the
deployed runtime. The site stays static.

## One-command gate

```bash
python3 scripts/seo_audit.py        # exits 0 only if everything passes; writes seo-audit-report.json
```

Use as a pre-deploy gate.

## Scripts

| script | what it does | idempotent |
|---|---|---|
| `seo_apply.py` | Task 1 noindex (12 pages), Task 2 hreflang upsert from the language switcher (strip on unpaired), Task 3 sitemap (remove noindex URLs, clamp future `lastmod`), broken-link repoints | yes |
| `seo_instrument.py` | Task 4+6: `data-seo="breadcrumb"` (Главная → тема/блог → пост), `data-seo="related"` on the related block, `data-seo="cta-landing"` on the /intro link | yes |
| `seo_audit.py` | encodes acceptance criteria: ROBOTS / CANONICAL / HREFLANG / SITEMAP / LINKGRAPH / THEME_MAP. Non-zero exit on any FAIL | n/a |

Re-running the migrations produces an empty diff; running the audit twice produces an identical report.

## Config

Edit the constants at the top of `seo_audit.py` / `seo_apply.py`:
`ORIGIN`, `EXPECTED_NOINDEX` (12), `KEEP_INDEXED` (6), `UTILITY_NOINDEX_OK`.

## Decision lists (printed by the audit)

- **unpaired** — RU/PL-only pages with no hreflang (RU-only posts, glossary terms, utility pages). Expected.
- **alt-canonical** — pages whose canonical ≠ self (thank-you pages). Review only.

## Not done here (manual / Cloudflare)

- PDF `X-Robots-Tag: noindex` — no headers config in repo; set in Cloudflare.
- No deploy, no GSC submission (out of scope for this pass).
