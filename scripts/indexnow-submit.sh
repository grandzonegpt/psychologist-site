#!/usr/bin/env bash
# IndexNow URL submission to Bing and Yandex.
# Usage: ./scripts/indexnow-submit.sh <url1> [url2 url3...]
# Example: ./scripts/indexnow-submit.sh https://levashou.pl/new-page.html
#
# Submits URLs via the shared api.indexnow.org endpoint which propagates
# to all participating engines (currently Bing and Yandex). A 200 or 202
# response means the URLs were accepted. Crawl happens within 24-72h.
#
# Update the KEY constant when rotating IndexNow keys; the file at
# /<KEY>.txt at site root must contain the same key.

set -e
KEY="27de7a757008df4e72a474d037269715"
HOST="levashou.pl"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <url1> [url2 url3...]"
  exit 1
fi

URLS_JSON=$(printf '"%s",' "$@" | sed 's/,$//')

curl -s -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"host\": \"${HOST}\",
    \"key\": \"${KEY}\",
    \"keyLocation\": \"https://${HOST}/${KEY}.txt\",
    \"urlList\": [${URLS_JSON}]
  }" -w "\nHTTP: %{http_code}\n"
