#!/usr/bin/env bash
# Batch phrase_this lookups for a list of keywords.
# Cost: 10 units per keyword.
# Usage: ./scripts/semrush/phrase-batch.sh KEYWORDS_FILE DATABASE OUTPUT_NAME
#   KEYWORDS_FILE: one keyword per line, # for comments
#   DATABASE: ru, pl, etc.
#   OUTPUT_NAME: e.g. playbook_ru

set -e
source "$(dirname "$0")/_lib.sh"

KW_FILE="${1:?Usage: $0 KEYWORDS_FILE DATABASE OUTPUT_NAME}"
DATABASE="${2:?Usage: $0 KEYWORDS_FILE DATABASE OUTPUT_NAME}"
OUT_NAME="${3:?Usage: $0 KEYWORDS_FILE DATABASE OUTPUT_NAME}"

[ -f "$KW_FILE" ] || { echo "File not found: $KW_FILE" >&2; exit 1; }

OUT_DIR="$DATA_DIR/phrase_overview"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/${OUT_NAME}_$(date +%Y%m%d).csv"

# Header
echo "Keyword;Search Volume;CPC;Competition;Number of Results;Trends;Keyword Difficulty Index" > "$OUT_FILE"

count=0
fail=0
while IFS= read -r kw; do
  # Skip comments and blank lines
  [[ -z "${kw// }" || "${kw#\#}" != "$kw" ]] && continue
  count=$((count + 1))
  printf "[%2d] %-50s ... " "$count" "$kw" >&2

  result=$(curl -sG "https://api.semrush.com/" \
    --data-urlencode "key=$SEMRUSH_API_KEY" \
    --data-urlencode "type=phrase_this" \
    --data-urlencode "phrase=$kw" \
    --data-urlencode "database=$DATABASE" \
    --data-urlencode "export_columns=Ph,Nq,Cp,Co,Nr,Td,Kd")

  if echo "$result" | grep -q "ERROR"; then
    echo "ERROR: $result" >&2
    fail=$((fail + 1))
  else
    # Skip header in result, append data line
    line=$(echo "$result" | tail -n +2)
    if [ -n "$line" ]; then
      echo "$line" >> "$OUT_FILE"
      vol=$(echo "$line" | awk -F';' '{print $2}')
      kd=$(echo "$line" | awk -F';' '{print $7}')
      printf "vol=%s KD=%s\n" "$vol" "$kd" >&2
    else
      echo "no data" >&2
      fail=$((fail + 1))
    fi
  fi
  # Tiny pause to be polite
  sleep 0.2
done < "$KW_FILE"

echo >&2
echo "Saved: $OUT_FILE" >&2
echo "Total: $count, failed: $fail" >&2
echo "$OUT_FILE"
