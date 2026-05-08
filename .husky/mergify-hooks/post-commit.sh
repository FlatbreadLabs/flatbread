#!/bin/sh
# Mergify CLI Hook Script
# This file is managed by mergify-cli and will be auto-upgraded.
# Do not modify - add custom logic to the wrapper file instead.
#
# Safety net: if the commit-msg hook did not run or failed to add a Change-Id,
# this hook generates one and amends the commit to include it.

# Prevent recursion from our own amend below
if test -n "$MERGIFY_POST_COMMIT_RUNNING"; then
    exit 0
fi

# Read the commit message once
body=$(git log -1 --format=%B 2>/dev/null)

# Check if the commit already has a Change-Id — nothing to do
if echo "$body" | grep -q "^Change-Id: I[0-9a-f]\{40\}$"; then
    exit 0
fi

# Generate a Change-Id the same way the commit-msg hook does
random=$( (whoami ; hostname ; date; echo "$body" ; echo $RANDOM) | git hash-object --stdin)

# Build the amended message: original message + blank line + Change-Id
msg_file=$(mktemp "${TMPDIR:-/tmp}/mergify-post-commit.XXXXXX") || {
    echo "mergify: warning: could not create temporary file for Change-Id amend" >&2
    exit 0
}
trap 'rm -f "$msg_file"' EXIT

echo "$body" > "$msg_file"
printf '\nChange-Id: I%s\n' "$random" >> "$msg_file"

# Amend the commit with --no-verify to avoid re-triggering hooks
export MERGIFY_POST_COMMIT_RUNNING=1
if git commit --amend -F "$msg_file" --no-verify --allow-empty 2>/dev/null; then
    echo "mergify: added missing Change-Id to commit" >&2
else
    echo "mergify: warning: could not add Change-Id to commit" >&2
fi
