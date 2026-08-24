#!/usr/bin/env bash
# Oracle gate for dag-funding-profile.json.
#
# The profile run re-screens the first report against a real applicant: one
# individual keeping a full-time job. Its central promise is that nothing
# demanding full-time work, relocation, or founding a company survives into the
# plan. This gate proves that promise mechanically — a program listed under
# `## Screened out by this profile` must not reappear under `## Do these now`
# or `## Programs by opportunity`.
#
# It checks shape and self-consistency, not truth. A passing run can still hold
# a wrong deadline.
#
# Prints PROFILE-SHAPE-OK and exits 0 when every check passes. Otherwise it
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
  [ -f "$path" ] || return
  if ! grep -qxF "$heading" "$path"; then
    fail "$path is missing the heading: $heading"
  fi
}

PROFILE="internal/funding/applicant-profile.md"
CALENDAR="internal/funding/deadlines-profile.md"
RESEARCH="internal/funding/research"

require_file "$PROFILE" 20000
require_file "$CALENDAR" 1200

for lane in \
  11-profile-rescreen \
  12-employer-ip \
  13-employer-routes \
  14-oss-credits \
  15-contributor-unlocks \
  16-profile-plan \
  17-profile-audit; do
  require_file "$RESEARCH/$lane.md" 2000
done

for heading in \
  "## The applicant" \
  "## What changed" \
  "## How to read the scores" \
  "## Do these now" \
  "## Comped AI spend" \
  "## Employer, IP and colleagues" \
  "## What co-maintainers unlock" \
  "## Programs by opportunity" \
  "## Program detail" \
  "## Screened out by this profile" \
  "## Open questions for Tony" \
  "## How this was made"; do
  require_heading "$PROFILE" "$heading"
done

for heading in \
  "## Dated deadlines" \
  "## Rolling and always-open" \
  "## Waiting on a next call" \
  "## Governance work with no deadline"; do
  require_heading "$CALENDAR" "$heading"
done

for heading in \
  "## Screened out by this profile" \
  "## Survives cleanly" \
  "## Coverage note"; do
  require_heading "$RESEARCH/11-profile-rescreen.md" "$heading"
done

for heading in \
  "## Hidden time costs" \
  "## Screens that should have fired" \
  "## What this plan is really worth"; do
  require_heading "$RESEARCH/17-profile-audit.md" "$heading"
done

if [ -f "$PROFILE" ]; then
  url_count=$(grep -c 'https\?://' "$PROFILE")
  if [ "$url_count" -lt 30 ]; then
    fail "$PROFILE holds only ${url_count} URLs; expected at least 30 evidence links"
  fi

  program_count=$(grep -c '^### ' "$PROFILE")
  if [ "$program_count" -lt 12 ]; then
    fail "$PROFILE holds only ${program_count} '### ' program blocks; expected at least 12"
  fi

  # A part-time maintainer needs the time cost of every program, so the schema
  # line is mandatory rather than advisory.
  time_lines=$(grep -c '^Time commitment —' "$PROFILE")
  if [ "$time_lines" -lt "$program_count" ]; then
    fail "$PROFILE has ${program_count} program blocks but only ${time_lines} 'Time commitment —' lines"
  fi

  # Every program must trace to a lane file. A writing node that cannot name
  # where a program came from has invented it.
  source_lines=$(grep -c '^Source —' "$PROFILE")
  if [ "$source_lines" -lt "$program_count" ]; then
    fail "$PROFILE has ${program_count} program blocks but only ${source_lines} 'Source —' provenance lines"
  fi

  if grep -nEi '^ *\|? *Deadline (—|-|:) *(the )?(next|last|this|coming) (month|week|spring|summer|autumn|fall|winter|year)\b' "$PROFILE"; then
    fail "$PROFILE states a deadline as a relative date; every deadline must carry an absolute date with its year"
  fi

  # The self-consistency check this gate exists for. Detail lines are captured
  # so one counted FAIL carries them, keeping the count and the output in step.
  consistency_output=$(python3 - "$PROFILE" <<'PY'
import re
import sys

path = sys.argv[1]
text = open(path, encoding="utf-8").read()


def section(name):
    """Body of one `## <name>` section, up to the next `## ` heading."""
    m = re.search(
        rf"^## {re.escape(name)}\s*$(.*?)(?=^## |\Z)", text, re.M | re.S
    )
    return m.group(1) if m else ""


def normalize(name):
    """Compare names without tripping on spacing, case, or dash style."""
    return re.sub(r"\s+", " ", name).strip().strip("`*").casefold().replace("—", "-")


def program_names(body):
    """Program names from the first cell of each table row, minus headers."""
    names = {}
    for line in body.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if not cells:
            continue
        name = cells[0].strip("` *")
        if not name or set(name) <= set("-: "):
            continue
        if name.lower() in {"program", "programme", "step", "date"}:
            continue
        names[normalize(name)] = name
    return names


def detail_headings(body):
    """Program names from each `### ` heading in the detail section."""
    return {
        normalize(m.group(1)): m.group(1).strip()
        for m in re.finditer(r"^### (.+?)\s*$", body, re.M)
    }


screened = program_names(section("Screened out by this profile"))
planned = program_names(section("Do these now")) | program_names(
    section("Programs by opportunity")
)

problems = []
if not screened:
    problems.append("no program rows parsed from '## Screened out by this profile'")
if not planned:
    problems.append(
        "no program rows parsed from '## Do these now' / '## Programs by opportunity'"
    )

for key in sorted(set(screened) & set(planned)):
    problems.append(
        f"'{planned[key]}' is screened out by this profile but still appears in the plan"
    )

# The report promises one detail block per master-table row. Coincidentally
# equal counts are not correspondence, so compare the two name sets.
table = program_names(section("Programs by opportunity"))
detail = detail_headings(section("Program detail"))

missing_detail = sorted(set(table) - set(detail))
orphan_detail = sorted(set(detail) - set(table))

if missing_detail:
    problems.append(
        f"{len(missing_detail)} master-table rows have no '### ' detail block, "
        f"starting with: {', '.join(table[k] for k in missing_detail[:5])}"
    )
if orphan_detail:
    problems.append(
        f"{len(orphan_detail)} detail blocks are absent from the master table, "
        f"starting with: {', '.join(detail[k] for k in orphan_detail[:5])}"
    )

if problems:
    for line in problems:
        print(f"  - {line}")
    sys.exit(1)

print(
    f"consistency ok: {len(screened)} screened out, {len(planned)} planned, "
    f"no overlap; {len(table)} master rows each match a detail block"
)
PY
  )
  if [ $? -ne 0 ]; then
    fail "$PROFILE contradicts itself:"
    echo "$consistency_output"
  else
    echo "$consistency_output"
  fi
fi

if [ "$fail_count" -gt 0 ]; then
  echo "PROFILE-SHAPE-FAILED: ${fail_count} problem(s)"
  exit 1
fi

echo "PROFILE-SHAPE-OK"
