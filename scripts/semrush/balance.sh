#!/usr/bin/env bash
# Show remaining Semrush API units. Costs: 0 units.
# Usage: ./scripts/semrush/balance.sh

set -e
source "$(dirname "$0")/_lib.sh"

balance=$(semrush_balance)
echo "Semrush API units remaining: $balance"
