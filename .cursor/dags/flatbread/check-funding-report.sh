#!/usr/bin/env bash
# Oracle gate for dag-funding-research.json.
#
# Checks that the run produced the files it promised and that the report
# carries every section a reader needs. It checks shape, not truth: a passing
# run can still hold a wrong deadline, so read `08-verification.md` before
# trusting a date.
#
# Prints REPORT-SHAPE-OK and exits 0 when every check passes. Otherwise it
# prints one FAIL line per problem and exits 1.

set -uo pipefail

fail_count=0

fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}

require_file() {
  local path="$1"
  local min_bytes="$2"
  if [ ! -f "$path" ]; then
    fail "missing file $path"
    return
  fi
  local size
  size=$(wc -c <"$path" | tr -d ' ')
  if [ "$size" -lt "$min_bytes" ]; then
    fail "$path is only ${size} bytes; expected at least ${min_bytes}"
  fi
}

require_heading() {
  local path="$1"
  local heading="$2"
  if [ ! -f "$path" ]; then
    return
  fi
  if ! grep -qxF "$heading" "$path"; then
    fail "$path is missing the heading: $heading"
  fi
}

REPORT="internal/funding/README.md"
DEADLINES="internal/funding/deadlines.md"
RESEARCH="internal/funding/research"

require_file "$REPORT" 20000
require_file "$DEADLINES" 1200
require_file "$RESEARCH/README.md" 600

for lane in \
  00-proof-fit-brief \
  01-oss-maintainer-funds \
  02-science-philanthropy \
  03-public-nondilutive \
  04-ai-compute-credits \
  05-accelerators-fellowships \
  06-exposure-adoption \
  07-merged-scored \
  08-verification \
  09-adversarial-audit \
  10-pitch-angles; do
  require_file "$RESEARCH/$lane.md" 2000
done

for heading in \
  "## What this report is" \
  "## How to read the scores" \
  "## Act first" \
  "## All programs by opportunity value" \
  "## Cash" \
  "## Comped AI spend and compute" \
  "## Exposure and adoption" \
  "## Program detail" \
  "## Screened out" \
  "## Open questions before applying" \
  "## How this report was made"; do
  require_heading "$REPORT" "$heading"
done

for heading in \
  "## Dated deadlines" \
  "## Rolling and always-open" \
  "## Waiting on a next call" \
  "## Missed this cycle"; do
  require_heading "$DEADLINES" "$heading"
done

for heading in \
  "## Verdict" \
  "## Eligibility blockers" \
  "## Confidence corrections" \
  "## Missed programs"; do
  require_heading "$RESEARCH/09-adversarial-audit.md" "$heading"
done

for heading in \
  "## Master table" \
  "## Expected-value order" \
  "## Screened out"; do
  require_heading "$RESEARCH/07-merged-scored.md" "$heading"
done

# The report is worthless without evidence links and program blocks.
if [ -f "$REPORT" ]; then
  url_count=$(grep -c 'https\?://' "$REPORT")
  if [ "$url_count" -lt 40 ]; then
    fail "$REPORT holds only ${url_count} URLs; expected at least 40 evidence links"
  fi

  program_count=$(grep -c '^### ' "$REPORT")
  if [ "$program_count" -lt 25 ]; then
    fail "$REPORT holds only ${program_count} '### ' program blocks; expected at least 25"
  fi

  # A relative date given as a deadline goes stale silently, so reject it. A
  # rolling cadence ("decided by the end of the next month") is not a date
  # claim, so only flag a relative phrase standing in for the deadline value.
  if grep -nEi '^ *\|? *Deadline (—|-|:) *(the )?(next|last|this|coming) (month|week|spring|summer|autumn|fall|winter|year)\b' "$REPORT"; then
    fail "$REPORT states a deadline as a relative date; every deadline must carry an absolute date with its year"
  fi

  # These phrases never carry a checkable date, wherever they appear.
  if grep -nEi '\b(a few weeks from now|sometime soon|in the near future|shortly after this report)\b' "$REPORT"; then
    fail "$REPORT uses a vague date phrase; name an absolute date or say UNKNOWN"
  fi
fi

if [ "$fail_count" -gt 0 ]; then
  echo "REPORT-SHAPE-FAILED: ${fail_count} problem(s)"
  exit 1
fi

echo "REPORT-SHAPE-OK"
