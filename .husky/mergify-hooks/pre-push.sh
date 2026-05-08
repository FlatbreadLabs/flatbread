#!/bin/sh
# Mergify CLI Hook Script
# This file is managed by mergify-cli and will be auto-upgraded.
# Do not modify - add custom logic to the wrapper file instead.
#
# Intercepts `git push` and suggests `mergify stack push` when on a stack branch.

# Skip if called from `mergify stack push` (which invokes git push internally)
if test -n "$MERGIFY_STACK_PUSH"; then
    exit 0
fi

# Only intercept if mergify stack is available
if ! command -v mergify >/dev/null 2>&1; then
    exit 0
fi

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Skip if not on a branch (detached HEAD)
if test -z "$branch"; then
    exit 0
fi

# Skip if on main/master/develop (not a stack branch)
case "$branch" in
    main|master|develop) exit 0 ;;
esac

# Check if this branch has a Change-Id (indicator it's a stack branch)
base_branch=$(git config --get "branch.${branch}.merge" 2>/dev/null | sed 's|refs/heads/||')
if test -z "$base_branch"; then
    exit 0
fi

# Check if any commit in the stack has a Change-Id
has_change_id=$(git log --format=%B "${base_branch}..HEAD" 2>/dev/null | grep -c "^Change-Id:")
if test "$has_change_id" -eq 0; then
    exit 0
fi

echo ""
echo "This branch is managed by Mergify stacks."
echo "   Use 'mergify stack push' instead of 'git push'."
echo ""
echo "   'mergify stack push' will:"
echo "   - Create/update PRs for each commit"
echo "   - Handle rebasing automatically"
echo "   - Keep the stack in sync"
echo ""
echo "   To proceed with 'git push' anyway, use: git push --no-verify"
echo ""
exit 1
