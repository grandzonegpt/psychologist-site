#!/usr/bin/env bash
# Shared library for semrush scripts.
# Sources .env.semrush, exports SEMRUSH_API_KEY, defines helper functions.
#
# Usage in other scripts:
#   source "$(dirname "$0")/_lib.sh"
#   semrush_call domain_ranks --domain=example.com --database=pl

# Locate project root by walking up
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.semrush"
DATA_DIR="$PROJECT_ROOT/data/semrush"

# Load env
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

if [ -z "${SEMRUSH_API_KEY:-}" ]; then
  echo "Error: SEMRUSH_API_KEY not set." >&2
  echo "Create $ENV_FILE with line: SEMRUSH_API_KEY=your_key_here" >&2
  exit 1
fi

mkdir -p "$DATA_DIR"

# Generic Semrush analytics API call.
# Args: type=domain_ranks domain=example.com database=pl [extras]
# Returns: CSV on stdout, status header in $SEMRUSH_LAST_HEADERS.
semrush_call() {
  local url="https://api.semrush.com/?key=${SEMRUSH_API_KEY}"
  for arg in "$@"; do
    url+="&${arg}"
  done
  curl -s "$url"
}

# Check API unit balance. Costs: 0 units.
semrush_balance() {
  curl -s "https://www.semrush.com/users/countapiunits.html?key=${SEMRUSH_API_KEY}"
}

# Save CSV output with timestamp.
# Usage: save_to <subdir> <filename> "<csv_data>"
save_to() {
  local subdir="$1"
  local filename="$2"
  local data="$3"
  local target_dir="$DATA_DIR/$subdir"
  mkdir -p "$target_dir"
  local target_file="$target_dir/${filename}_$(date +%Y%m%d).csv"
  echo "$data" > "$target_file"
  echo "Saved: $target_file" >&2
  echo "$target_file"
}
