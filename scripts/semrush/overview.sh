#!/usr/bin/env bash
# Domain overview: traffic, ranking keywords, organic positions distribution.
# Cost: ~200 units per call.
# Usage: ./scripts/semrush/overview.sh DOMAIN [DATABASE]
#   DATABASE: pl (default), ru, ua, de, it, us, etc.

set -e
source "$(dirname "$0")/_lib.sh"

DOMAIN="${1:?Usage: $0 DOMAIN [DATABASE]}"
DATABASE="${2:-pl}"

echo "Fetching domain overview for $DOMAIN (database: $DATABASE)..." >&2

result=$(semrush_call \
  "type=domain_ranks" \
  "domain=${DOMAIN}" \
  "database=${DATABASE}" \
  "export_columns=Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac,FKn,FPn")

# Show first lines to terminal
echo "$result" | head -5
echo "..."

# Save to data/semrush/<domain>/overview_<db>_<date>.csv
save_to "${DOMAIN//[\/:]/_}" "overview_${DATABASE}" "$result"
