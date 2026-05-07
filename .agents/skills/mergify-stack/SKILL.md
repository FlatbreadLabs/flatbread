---
name: mergify-stack
description: Use Mergify stacks for git push, commit, branch, and PR creation. ALWAYS use this skill when pushing code, creating commits, creating branches, or creating PRs. Triggers on push, commit, branch, PR, pull request, stack, stacked, git, rebase, checkout, reorder, move, sync, amend, note, revision history.
---

# Mergify Stack Workflow

## Stack Philosophy

A branch is a stack. Keep stacks short and focused:
- A stack should only contain commits that **depend on each other**
- Rationale: longer stacks take longer to merge

**Proactive stack management:**
- If an existing stack can be split into independent stacks, offer to do so
- When asked to do something new: if it can be done on a separate branch, either do so or ask if in doubt
- Default to creating a new branch for unrelated changes

## Core Conventions

- **Push**: Use `mergify stack push` (never `git push`)
- **Fixes**: Use `git commit --amend` (never create new commits to fix issues)
- **Amend notes**: When amending a commit that already has a PR (i.e. has been pushed), attach a `mergify stack note` BEFORE `mergify stack push` to record *why* the commit was amended. The note appears in the PR's "Revision history" comment and JSON marker, so reviewers can see the reason without diffing.
- **Mid-stack fixes**: Stash any local changes first (`git stash -u`), then use `git rebase -i` to edit the specific commit, amend it, continue rebase, then `mergify stack push`, then `git stash pop`
- **Reordering**: Stash any local changes first (`git stash -u`), then use `mergify stack reorder` (list all commits in desired order) or `mergify stack move` (move a single commit) instead of manual `git rebase -i` — non-interactive and avoids `GIT_SEQUENCE_EDITOR` quoting issues
- **Fixup**: Stash any local changes first (`git stash -u`), then use `mergify stack fixup <SHA>...` to fold a commit into its parent (drops the listed commit's message). Non-interactive — never use `git rebase -i` for this.
- **Squash**: Stash any local changes first (`git stash -u`), then use `mergify stack squash SRC... into TARGET [-m "msg"]` to combine multiple commits into one, with an optional custom message. Non-interactive — never use `git rebase -i` for this.
- **Commit titles**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`)
- **PR title & body**: `mergify stack` copies the commit message title to the PR title and the commit message body to the PR body — so write commit messages as if they were PR descriptions. **Everything that should appear in the PR (ticket references, context, test plans) MUST go in the commit message.**
- **Ticket references**: Include ticket/issue references (e.g., `MRGFY-1234`, `Fixes #123`) in the commit message body, not added separately to the PR.
- **PR lifecycle is fully managed by `mergify stack`**: NEVER edit PR titles, bodies, or labels with `gh pr edit` or the GitHub MCP — they will be overwritten on the next push. NEVER close or merge PRs manually — `mergify stack` handles the entire PR lifecycle (creation, updates, and cleanup).
- **Draft PRs**: NEVER mark a PR as ready-for-review — all PRs stay as drafts. The user will manually move them out of draft after reviewing.
- **Each commit must pass CI independently**: Every commit in a stack becomes its own PR. Each PR runs CI separately, so every commit must be self-contained — it must compile, pass linters, and pass tests on its own without depending on later commits in the stack. When formatting or linting fixes are needed, they must be included in the commit that introduced the issue, not deferred to a later commit.

## Common Mistakes

| Wrong | Right | Why |
|-------|-------|-----|
| `git push` | `mergify stack push` | Git push bypasses stack management and breaks PR relationships |
| New commit to fix lint/typo | `git commit --amend` (HEAD) or `git commit --fixup <SHA>` + `git rebase --autosquash` (mid-stack) | Each commit = a PR; fix commits create unwanted extra PRs |
| `gh pr edit --title "..."` | Edit the commit message, then `mergify stack push` | PR title/body are overwritten from commit messages on every push |
| `gh pr merge` or `gh pr close` | PR lifecycle is fully managed — do nothing | PR lifecycle is fully managed by the stack tool |
| `git commit` on `main` | `mergify stack new <name>` first | `mergify stack push` will fail on the default branch |
| `git rebase -i` to fixup a commit | `mergify stack fixup <SHA>` | Non-interactive — works inside LLM/agent sessions; no editor spawned |
| `git rebase -i` to squash commits | `mergify stack squash A B into X [-m "..."]` | Non-interactive — works inside LLM/agent sessions; no editor spawned |
| Deferring lint fixes to a later commit | Include the fix in the commit that caused it | Each commit runs CI independently; later commits won't save earlier ones |
| Rebase/reorder/checkout/sync with dirty worktree | `git stash -u` first, then `git stash pop` after | Uncommitted changes are lost or cause conflicts during these operations |
| Amending a pushed commit with no explanation | `mergify stack note -m "why"` before `mergify stack push` | The reason is recorded in the PR's Revision history table and JSON marker, so reviewers don't need to diff to understand the change |

## Commands

```bash
mergify stack new NAME       # Create a new stack/branch for new work
mergify stack push           # Push and create/update PRs
mergify stack checkout NAME  # Checkout an existing stack from GitHub (e.g. someone else's)
mergify stack sync           # Fetch trunk, remove merged commits, rebase
mergify stack list           # Show commit <-> PR mapping for current stack
mergify stack list --json    # Same, but machine-readable JSON output
mergify stack reorder C A B  # Reorder all commits (pass SHA or Change-Id prefixes)
mergify stack move X first   # Move commit X to the top of the stack
mergify stack move X last    # Move commit X to the bottom of the stack
mergify stack move X before Y  # Move commit X before commit Y
mergify stack move X after Y   # Move commit X after commit Y
mergify stack fixup X              # Fold commit X into its parent (drops X's message)
mergify stack fixup X Y Z          # Fold each into its parent (multi-fixup)
mergify stack squash X into Y      # Reorder X adjacent to Y, fold X into Y (keeps Y's message)
mergify stack squash X Y into Z -m "msg"  # Fold X Y into Z with a custom message
mergify stack note -m "why"        # Attach an amend reason to HEAD (shown in PR revision history)
mergify stack note <SHA-or-Change-Id-prefix> -m "why"  # Attach to a specific commit in the stack
mergify stack note --append -m "more"                  # Append to an existing note
mergify stack note --remove                            # Remove the note from a commit
```

Use `mergify stack checkout NAME` to check out a stack that exists on GitHub (e.g. a colleague's stack). NAME is the remote branch name of the stack. It fetches all stacked PRs, creates a local branch, and sets up tracking. Use `--branch` to override the local branch name.

Use `mergify stack sync` to bring your stack up to date. It fetches the latest trunk, detects which PRs have been merged, removes those commits from your local branch, and rebases the remaining commits. Run this before starting new work on an existing stack.

Use `mergify stack list` to see which commits have been pushed, which PRs they map to, and whether the stack is up to date with the remote. It also shows CI status, review status, and merge conflicts for each PR. Use `--verbose` for detailed check names and reviewer names. Use `--json` when you need to parse the output programmatically — it includes full CI check details and review data.

## Amend Notes

`mergify stack note` records *why* a commit was amended. The note travels with the stack:

- Stored locally under `refs/notes/mergify/stack` against the commit SHA.
- Pushed automatically by `mergify stack push` (alongside the commit refspecs, with `--force-with-lease`).
- Surfaced in the PR's **Revision history** comment as the `Reason` column of the markdown table, and embedded in the `<!-- mergify-revision-data: {...} -->` JSON marker (key `reason`) so it can be parsed programmatically.

**When to attach a note** — any time you amend or rewrite a commit that already has a PR open (i.e. it has been pushed at least once). The note answers "why is this revision different?" so the reviewer doesn't have to diff old vs new SHAs to find out.

**Workflow** — attach the note BEFORE `mergify stack push`:

```bash
# Edit HEAD, then:
git commit --amend
mergify stack note -m "address review: rename foo() to bar()"
mergify stack push

# Or for a mid-stack commit (after the rebase that amended it):
mergify stack note <SHA-or-Change-Id-prefix> -m "fix lint reported in CI"
mergify stack push
```

A note is per-commit, not per-revision. Each amend (or other history rewrite) creates a new commit SHA, so you must run `mergify stack note` again for the new SHA — the previous note stays attached to the old SHA and won't carry over. Use `--append` only when the current target commit already has a note and you want to add another reason; use `--remove` to clear it. Notes on commits that haven't changed since the last push are preserved but won't add a new revision row.

## CRITICAL: Check Branch Before ANY Commit

**BEFORE staging or committing anything**, always check the current branch and assess stack state:

```bash
git branch --show-current
mergify stack list
```

- If you're on `main` (or the repo's default branch): you **MUST** create a feature branch first
- **NEVER commit directly on `main`** — `mergify stack push` will fail
- This check must happen before `git add`, not after `git commit`

## CRITICAL: Stash Local Changes Before Worktree-Modifying Operations

**BEFORE running any operation that rewrites history or switches branches**, check for uncommitted changes and stash them:

```bash
git status --short          # Check for uncommitted changes
git stash -u                # Stash tracked + untracked changes if any
```

**Operations that require this check:**
- `git rebase -i` (mid-stack fixes)
- `mergify stack reorder` / `mergify stack move`
- `mergify stack fixup`
- `mergify stack squash`
- `mergify stack checkout`
- `mergify stack sync`
- `mergify stack new` (switches to new branch)
- `git checkout <branch>`

**After the operation completes**, restore the stashed changes:

```bash
git stash pop
```

If you skip this step, uncommitted work will be **silently lost** or cause rebase conflicts.

## Starting New Work

When asked to start a new piece of work, create a new feature, or work on something unrelated to the current stack:

1. **Check current branch**: `git branch --show-current`
2. **Create a new stack**: `mergify stack new <branch-name>`
   - Use descriptive branch names following the pattern: `type/short-description` (e.g., `feat/add-login`, `fix/memory-leak`)
3. **Make commits** following conventional commits
4. **Push**: `mergify stack push`

## Adding to Existing Stack

When continuing work on an existing feature branch:

1. **Check current branch**: `git branch --show-current`
   - If on the right branch: proceed with commits
   - If on `main`: switch to the feature branch first with `git checkout <branch>` or create a new stack

## Conflict Resolution

When a rebase causes conflicts (during `git rebase -i` or `mergify stack push`):

1. Resolve conflicts in your editor
2. Stage resolved files with `git add`
3. Continue with `git rebase --continue`

To abort instead: `git rebase --abort`

After resolving, run `mergify stack push` to sync the updated stack.
