# Semrush API scripts

Pull data from Semrush API via curl. Requires `SEMRUSH_API_KEY` in `.env.semrush` at project root.

## Setup

1. Get API key from `semrush.com/users/subscription_info/` (API section).
2. Create `.env.semrush` in project root:
   ```
   SEMRUSH_API_KEY=your_key_here
   ```
3. `.env.semrush` is already in `.gitignore`. Never commit it.
4. Make scripts executable:
   ```
   chmod +x scripts/semrush/*.sh
   ```

## Scripts

| Script | Cost | What it does |
|---|---|---|
| `balance.sh` | 0 units | Show remaining API units |
| `overview.sh DOMAIN [DB]` | 200 units | Domain overview: traffic, keywords count, distribution |
| `backlinks-overview.sh DOMAIN` | 50 units | Total backlinks, ref domains, anchor count |
| `refdomains.sh DOMAIN [LIMIT]` | ~0.4 unit/row | Referring domains sorted by Authority Score |
| `domain-keywords.sh DOMAIN [DB] [LIMIT]` | ~0.5 unit/row | Organic keywords a domain ranks for |
| `keyword-gap.sh COMPETITOR [DB] [LIMIT]` | ~0.5 unit/row | Keywords competitor has, we don't |

## Database codes

- `pl` — Poland (Polish Google)
- `ru` — Russia
- `ua` — Ukraine
- `de` — Germany
- `it` — Italy
- `us` — USA
- Full list: https://www.semrush.com/api-analytics/#databases

## Output

All CSVs go to `data/semrush/<sanitized_domain>/<report>_<date>.csv`. Path is gitignored.

## Examples

```bash
# Check unit balance first
./scripts/semrush/balance.sh

# Our domain overview in PL database
./scripts/semrush/overview.sh levashou.pl pl

# Backlinks overview for a competitor
./scripts/semrush/backlinks-overview.sh alter.app

# Top 500 referring domains of competitor (costs ~200 units)
./scripts/semrush/refdomains.sh alter.app 500

# Top 200 organic keywords we rank for in Polish
./scripts/semrush/domain-keywords.sh levashou.pl pl 200

# Keyword gap: what alter.app has that we don't (top 200, RU database)
./scripts/semrush/keyword-gap.sh alter.app ru 200
```

## Budget planning

50,000 units lasts a long time if you're disciplined. Rough plan:

| Task | Cost |
|---|---|
| Balance check before each batch | 0 |
| Domain overview for levashou.pl (RU + PL) | 400 |
| Backlinks overview for 6 competitors | 300 |
| Top 500 refdomains for 5 competitors | ~1,000 |
| Top 500 keywords for levashou.pl (RU + PL) | ~500 |
| Top 300 keyword gaps × 5 competitors | ~750 |
| Total Day 1 extraction | ~3,000 units |

Plenty of buffer for follow-up queries and re-runs.

## Column codes reference

Semrush uses short codes for columns. Common ones:

- `Ph` — Phrase (keyword)
- `Po` — Position
- `Pp` — Previous position
- `Pd` — Position difference
- `Nq` — Search volume
- `Cp` — CPC
- `Co` — Competition (0-1)
- `Nr` — Number of results
- `Td` — Trend
- `Tr` — Traffic share
- `Tc` — Traffic cost
- `Ur` — URL
- `Kd` — Keyword Difficulty
- `Db` — Database
- `Dn` — Domain
- `Rk` — Rank
- `Or` — Organic keywords count
- `Ot` — Organic traffic
- `Oc` — Organic traffic cost
- `FKn` — Featured snippets count

Full list: https://www.semrush.com/api-analytics/#columns
