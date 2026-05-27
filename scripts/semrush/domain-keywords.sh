#!/usr/bin/env bash
# Organic keywords that a domain ranks for.
# Cost: ~0.5 unit per line.
# Usage: ./scripts/semrush/domain-keywords.sh DOMAIN [DATABASE] [LIMIT]
#   DATABASE: pl (default), ru, ua, de, it
#   LIMIT: max rows (default 100)

set -e
source "$(dirname "$0")/_lib.sh"

DOMAIN="${1:?Usage: $0 DOMAIN [DATABASE] [LIMIT]}"
DATABASE="${2:-pl}"
LIMIT="${3:-100}"

echo "Fetching top $LIMIT organic keywords for $DOMAIN ($DATABASE)..." >&2

result=$(semrush_call \
  "type=domain_organic" \
  "domain=${DOMAIN}" \
  "database=${DATABASE}" \
  "display_limit=${LIMIT}" \
  "display_sort=tr_desc" \
  "export_columns=Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td,Ts,Kd")

echo "$result" | head -5
echo "..."

save_to "${DOMAIN//[\/:]/_}" "keywords_${DATABASE}_top${LIMIT}" "$result"
