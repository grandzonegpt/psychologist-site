#!/usr/bin/env bash
# Keyword gap between our domain and a competitor.
# Returns keywords competitor ranks for but we don't.
# Cost: ~0.5 unit per line.
# Usage: ./scripts/semrush/keyword-gap.sh COMPETITOR [DATABASE] [LIMIT]
#   We are always levashou.pl.
#   COMPETITOR: domain to compare against
#   DATABASE: pl (default), ru, etc.
#   LIMIT: max rows (default 200)

set -e
source "$(dirname "$0")/_lib.sh"

COMPETITOR="${1:?Usage: $0 COMPETITOR [DATABASE] [LIMIT]}"
DATABASE="${2:-pl}"
LIMIT="${3:-200}"
OUR_DOMAIN="levashou.pl"

echo "Keyword gap: $COMPETITOR has, $OUR_DOMAIN doesn't ($DATABASE, top $LIMIT)..." >&2

# Note: domain_domains type compares two domains' keywords.
# Filter type "missing" = keywords competitor has but we don't.
result=$(semrush_call \
  "type=domain_domains" \
  "domains=*|or|${COMPETITOR}|*|or|${OUR_DOMAIN}" \
  "database=${DATABASE}" \
  "display_limit=${LIMIT}" \
  "display_sort=p1_desc" \
  "export_columns=Ph,P0,P1,Nq,Cp,Co,Kd")

echo "$result" | head -5
echo "..."

save_to "gap_${COMPETITOR//[\/:]/_}_vs_${OUR_DOMAIN}" "gap_${DATABASE}_top${LIMIT}" "$result"
