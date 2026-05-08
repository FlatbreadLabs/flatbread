#!/bin/sh
# Mergify CLI Hook Script
# This file is managed by mergify-cli and will be auto-upgraded.
# Do not modify - add custom logic to the wrapper file instead.
#
# Based on Gerrit Code Review 3.1.3
#
# Part of Gerrit Code Review (https://www.gerritcodereview.com/)
#
# Copyright (C) 2009 The Android Open Source Project
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# avoid [[ which is not POSIX sh.
if test "$#" != 1 ; then
  echo "$0 requires an argument."
  exit 1
fi

if test ! -f "$1" ; then
  echo "file does not exist: $1"
  exit 1
fi

# $RANDOM will be undefined if not using bash, so don't use set -u
# $RANDOM is undefined in POSIX sh (dash), so include HEAD's SHA for entropy
# to prevent collisions when two commits have the same message in the same second
random=$( (whoami ; hostname ; date; cat $1 ; echo $RANDOM; git rev-parse HEAD 2>/dev/null) | git hash-object --stdin)
dest="$1.tmp.${random}"

trap 'rm -f "${dest}"' EXIT

# Reuse a Change-Id from a prior commit on this branch with the same subject.
# Handles amends and reset-and-recreate cycles (where a branch is reset to main
# and the same stack is rebuilt from scratch, which would otherwise generate new
# Change-Ids and break PR tracking).
if ! grep -q "^Change-Id:" "$1"; then
    subject=$(head -1 "$1")
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if test -n "$branch" && test "$branch" != "HEAD"; then
        reuse_cid=""
        for sha in $(git reflog "$branch" --format='%H' -n 50 2>/dev/null); do
            s=$(git log -1 --format=%s "$sha" 2>/dev/null)
            if test "$s" = "$subject"; then
                # Only reuse from commits no longer in the branch (reset away).
                # Skip commits still reachable from HEAD to avoid giving two
                # active stack commits the same Change-Id.
                git merge-base --is-ancestor "$sha" HEAD 2>/dev/null && continue
                reuse_cid=$(git log -1 --format=%B "$sha" 2>/dev/null | grep "^Change-Id: I[0-9a-f]\{40\}$" | tail -1 | sed 's/^Change-Id: I//')
                test -n "$reuse_cid" && break
            fi
        done
        if test -n "$reuse_cid"; then
            random="$reuse_cid"
        fi
    fi
fi

# cut everything from the scissor marker downwards, then strip comments/whitespace
if ! (sed '/^# -\{24\} >8 -\{24\}$/,$d' | git stripspace --strip-comments) < "$1" > "${dest}" ; then
   echo "cannot strip comments from $1"
   exit 1
fi

if test ! -s "${dest}" ; then
  echo "file is empty: $1"
  exit 1
fi

# Avoid the --in-place option which only appeared in Git 2.8
# Avoid the --if-exists option which only appeared in Git 2.15
if ! git -c trailer.ifexists=doNothing interpret-trailers \
      --trailer "Change-Id: I${random}" < "$1" > "${dest}" ; then
  echo "cannot insert change-id line in $1"
  exit 1
fi

if ! mv "${dest}" "$1" ; then
  echo "cannot mv ${dest} to $1"
  exit 1
fi
