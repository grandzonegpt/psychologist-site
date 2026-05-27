#!/usr/bin/env bash
# Referring domains list for a target (sorted by ascore desc).
# Cost: ~0.4 unit per line = 40 units per 100 lines.
# Usage: ./scripts/semrush/refdomains.sh DOMAIN [LIMIT]
#   LIMIT: max rows (default 100, max 10000)

set -e
source "$(dirname "$0")/_lib.sh"

DOMAIN="${1:?Usage: $0 DOMAIN [LIMIT]}"
LIMIT="${2:-100}"

echo "Fetching top $LIMIT referring domains for $DOMAIN..." >&2

result=$(semrush_backlinks_call \
  "type=backlinks_refdomains" \
  "target=${DOMAIN}" \
  "target_type=root_domain" \
  "display_limit=${LIMIT}" \
  "display_sort=domain_ascore_desc")

echo "$result" | head -10
echo "..."
echo "(showing first 10 of $LIMIT requested rows)"

save_to "${DOMAIN//[\/:]/_}" "refdomains_top${LIMIT}" "$result"
