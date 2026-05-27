#!/usr/bin/env bash
# Backlinks overview for a domain: total backlinks, ref domains, anchor counts.
# Cost: ~50 units per call.
# Usage: ./scripts/semrush/backlinks-overview.sh DOMAIN
#   Where DOMAIN can be: domain (root_domain), subdomain (sub_domain), or url

set -e
source "$(dirname "$0")/_lib.sh"

DOMAIN="${1:?Usage: $0 DOMAIN}"

echo "Fetching backlinks overview for $DOMAIN..." >&2

result=$(semrush_backlinks_call \
  "type=backlinks_overview" \
  "target=${DOMAIN}" \
  "target_type=root_domain")

echo "$result"
save_to "${DOMAIN//[\/:]/_}" "backlinks_overview" "$result"
