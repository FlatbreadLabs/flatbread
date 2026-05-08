#!/bin/sh
# Mergify CLI Hook Script
# This file is managed by mergify-cli and will be auto-upgraded.
# Do not modify - add custom logic to the wrapper file instead.
#
#  Copyright © 2021-2026 Mergify SAS
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.

# This hook preserves Change-Id during amend operations
# where the message is provided via -m or -F flags (which would otherwise lose
# this trailer).
#
# Arguments:
#   $1 - Path to the commit message file
#   $2 - Source of the commit message: message, template, merge, squash, or commit
#   $3 - Commit SHA (only for squash or commit source)

if test "$#" -lt 1; then
    exit 0
fi

MSG_FILE="$1"
SOURCE="${2:-}"

# If source is "commit" (from --amend or -c/-C), git already preserves the
# original message content including trailers, so we don't need to do anything.
# This hook is specifically for the case where -m or -F is used with --amend,
# which sets source to "message" and loses the original trailers.

# Only act if we have a message file
if test ! -f "$MSG_FILE"; then
    exit 0
fi

# Check if HEAD exists (not initial commit)
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
    exit 0
fi

# Function to detect if this is an amend operation with -m flag
is_amend_with_m_flag() {
    # Heuristic to detect amend: During --amend, git sets GIT_AUTHOR_DATE to preserve
    # the original author date. This date should exactly match HEAD's author date.
    # For a regular commit, GIT_AUTHOR_DATE is not set by git.
    # We also check that source is "message" (set by git for both -m and -F flags).
    if test "$SOURCE" != "message" || test -z "$GIT_AUTHOR_DATE"; then
        return 1
    fi

    # Get HEAD's author date in the same format git uses internally (raw format)
    # The raw format is: seconds-since-epoch timezone (e.g., "1234567890 +0000")
    HEAD_AUTHOR_DATE_RAW=$(git log -1 --format=%ad --date=raw HEAD 2>/dev/null)
    if test -z "$HEAD_AUTHOR_DATE_RAW"; then
        return 1
    fi

    # Extract epoch from GIT_AUTHOR_DATE (handles various formats)
    # During amend, GIT_AUTHOR_DATE is in format: "@epoch tz" (e.g., "@1234567890 +0000")
    # Remove the @ prefix if present
    GIT_AUTHOR_EPOCH=$(echo "$GIT_AUTHOR_DATE" | cut -d' ' -f1 | tr -d '@')
    HEAD_AUTHOR_EPOCH=$(echo "$HEAD_AUTHOR_DATE_RAW" | cut -d' ' -f1)

    # If the epoch timestamps match, this is likely an amend operation.
    # Additional check: the author date should be at least 2 seconds in the past.
    # This prevents false positives when commits happen in quick succession
    # (e.g., in automated tests or scripts) where timestamps might match by coincidence.
    if test "$GIT_AUTHOR_EPOCH" != "$HEAD_AUTHOR_EPOCH"; then
        return 1
    fi

    CURRENT_EPOCH=$(date +%s)
    AGE=$((CURRENT_EPOCH - GIT_AUTHOR_EPOCH))
    if test "$AGE" -lt 2; then
        return 1
    fi

    return 0
}

# Only proceed if this is an amend with -m flag
if ! is_amend_with_m_flag; then
    exit 0
fi

# Track if we need to add a blank line before trailers
NEED_BLANK_LINE=false

# Preserve Change-Id if missing from current message but present in HEAD
if ! grep -q "^Change-Id: I[0-9a-f]\{40\}$" "$MSG_FILE"; then
    HEAD_CHANGEID=$(git log -1 --format=%B HEAD 2>/dev/null | grep "^Change-Id: I[0-9a-f]\{40\}$" | tail -1)
    if test -n "$HEAD_CHANGEID"; then
        if test "$NEED_BLANK_LINE" = "false"; then
            echo "" >> "$MSG_FILE"
            NEED_BLANK_LINE=true
        fi
        echo "$HEAD_CHANGEID" >> "$MSG_FILE"
    fi
fi
