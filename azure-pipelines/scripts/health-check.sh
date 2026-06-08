#!/usr/bin/env bash
# =============================================================================
# health-check.sh — Poll one or more HTTP endpoints until they return 200,
# or fail the deployment after a timeout. Used in the Verify step.
#
# Usage:
#   health-check.sh "core=https://host/api/health" "web=https://host/" ...
# Env:
#   TIMEOUT_SECONDS (default 300), INTERVAL_SECONDS (default 15)
# =============================================================================
set -uo pipefail

TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-300}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-15}"

if [ "$#" -eq 0 ]; then
  echo "ERROR: provide at least one 'name=url' endpoint argument." >&2
  exit 2
fi

check_one() {
  local name="$1" url="$2" deadline
  deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
  echo "→ Checking '$name' at $url (timeout ${TIMEOUT_SECONDS}s)"
  while :; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" || echo "000")
    if [ "$code" = "200" ]; then
      echo "  ✔ $name healthy (HTTP 200)"
      return 0
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "  x $name FAILED — last status HTTP $code after ${TIMEOUT_SECONDS}s" >&2
      return 1
    fi
    echo "  … $name not ready (HTTP $code) — retrying in ${INTERVAL_SECONDS}s"
    sleep "$INTERVAL_SECONDS"
  done
}

failures=0
for pair in "$@"; do
  name="${pair%%=*}"
  url="${pair#*=}"
  check_one "$name" "$url" || failures=$((failures + 1))
done

if [ "$failures" -gt 0 ]; then
  echo "Health check failed for $failures endpoint(s)." >&2
  exit 1
fi
echo "All endpoints healthy."
