---
name: mergify-merge-protections
description: Use Mergify merge protections to control when PRs merge — PR dependencies (Depends-On header), delayed merges (Merge-After header), and scheduled freezes (CLI). ALWAYS use this skill when managing merge freezes, deployment windows, temporarily blocking merges, setting up PR dependencies, blocking a PR on another PR, coordinating cross-repo merges, scheduling a merge for a specific time, or adding Depends-On or Merge-After headers to PRs. Triggers on freeze, scheduled freeze, merge freeze, deployment freeze, halt merges, depends on, dependency, block merge, merge after, merge later, schedule merge, delayed merge, cross-repo, merge protection.
---

# Mergify Merge Protections

Merge protections control when PRs are allowed to merge:

| Protection | Scope | How |
|------------|-------|-----|
| **Depends-On** | Per-PR dependency chain | `Depends-On:` header in PR body |
| **Merge-After** | Per-PR time gate | `Merge-After:` header in PR body |
| **Scheduled Freezes** | Repository-wide or conditional | CLI commands (`mergify freeze`) |

`Depends-On` and `Merge-After` are built-in — just add the header to the PR description (or commit message body when using `mergify stack push`) and Mergify enforces them automatically, no `.mergify.yml` configuration needed. Freezes are managed via CLI commands.

## Depends-On

Block a PR from merging until one or more other PRs are merged first.

### Syntax

Add one or more `Depends-On:` lines to the PR body:

```
Depends-On: #123
Depends-On: https://github.com/org/other-repo/pull/456
Depends-On: org/other-repo#789
```

All three formats are supported — use `#NNN` for same-repo, full URL or `org/repo#NNN` for cross-repo.

### Rules

- All referenced PRs must be in repositories with Mergify enabled
- All referenced PRs must belong to the same GitHub organization
- Circular dependencies and self-references are silently ignored
- Multiple `Depends-On:` lines are allowed (one per line)

### With `mergify stack push`

The stack tool **automatically** adds `Depends-On: #NNN` between consecutive PRs in a stack. For dependencies *outside* the stack (cross-repo or unrelated PRs), add the header manually to the **commit message body** — it will be copied to the PR description on push.

### When to suggest

- Feature spanning multiple repos (e.g., API change + client update)
- Schema migration must merge before application code
- Shared library update must land before consumers

## Merge-After

Postpone merging until a specified date and time.

### Syntax

Add a `Merge-After:` line to the PR body:

```
Merge-After: 2025-09-01T09:00:00Z
```

### Supported timestamp formats (ISO 8601)

```
Merge-After: 2025-09-01                          # date only (midnight UTC)
Merge-After: 2025-09-01T09:00:00                 # no timezone (assumed UTC)
Merge-After: 2025-09-01T09:00:00Z                # explicit UTC
Merge-After: 2025-09-01T09:00:00+02:00           # with UTC offset
Merge-After: 2025-09-01T09:00:00[Europe/Paris]   # with IANA timezone
```

If no timezone is specified, UTC is assumed.

### When to suggest

- Coordinated release: multiple PRs should merge together at a specific time
- Merge during a maintenance window or off-peak hours
- Embargo: PR is ready but should not ship before a date

### Combining Depends-On and Merge-After

Both headers can be used together on the same PR:

```
This PR updates the billing API to support the new pricing model.

Depends-On: org/billing-service#42
Merge-After: 2025-06-15T10:00:00[US/Eastern]
```

The PR will not merge until PR #42 in `billing-service` is merged **and** the specified time has passed.

## Scheduled Freezes

Scheduled freezes temporarily halt merging of pull requests matching specific conditions. Use them for deployment windows, incident response, maintenance periods, or any situation where merges should be paused.

## Commands

```bash
mergify freeze list                       # List all scheduled freezes
mergify freeze list --json                # Machine-readable JSON output
mergify freeze create OPTIONS             # Create a new scheduled freeze
mergify freeze update FREEZE_ID OPTIONS   # Update an existing freeze
mergify freeze delete FREEZE_ID           # Delete a freeze
```

## Authentication

All commands require a Mergify or GitHub token:
- `--token` / `-t` (env: `MERGIFY_TOKEN` or `GITHUB_TOKEN`) -- defaults to `gh auth token`
- `--repository` / `-r` -- Repository full name (auto-detected from git remote)
- `--api-url` / `-u` (env: `MERGIFY_API_URL`) -- Mergify API URL (default: `https://api.mergify.com`)

## Creating a Freeze

```bash
# Emergency freeze (starts now, no end time)
mergify freeze create \
  --reason "Production incident - halting all merges" \
  --timezone "US/Eastern"

# Scheduled maintenance window
mergify freeze create \
  --reason "Weekend deployment freeze" \
  --timezone "Europe/Paris" \
  --start "2024-12-20T18:00:00" \
  --end "2024-12-23T08:00:00"

# Freeze with conditions (only freeze merges to main)
mergify freeze create \
  --reason "Release freeze for v2.0" \
  --timezone "UTC" \
  -c "base=main"

# Freeze with exclusions (allow hotfix PRs through)
mergify freeze create \
  --reason "Code freeze" \
  --timezone "UTC" \
  -c "base=main" \
  -e "label=hotfix"
```

**Required options:**
- `--reason` -- Human-readable reason for the freeze
- `--timezone` -- IANA timezone name (e.g., `Europe/Paris`, `US/Eastern`, `UTC`)

**Optional options:**
- `--start` -- Start time in ISO 8601 format (default: now)
- `--end` -- End time in ISO 8601 format (default: no end, emergency freeze)
- `--condition` / `-c` -- Matching condition (repeatable, e.g., `-c 'base=main'`)
- `--exclude` / `-e` -- Exclude condition (repeatable, e.g., `-e 'label=hotfix'`)

## Listing Freezes

```bash
# Table view
mergify freeze list

# JSON output for scripting
mergify freeze list --json
```

The table shows: ID, reason, start/end times with timezone, matching conditions, and active/scheduled status.

## Updating a Freeze

```bash
# Extend a freeze
mergify freeze update FREEZE_ID --end "2024-12-24T08:00:00"

# Change the reason
mergify freeze update FREEZE_ID --reason "Extended: waiting for hotfix"

# Set exclusions (replaces the full exclusion list, does not append)
mergify freeze update FREEZE_ID -e "label=emergency"
```

The `FREEZE_ID` is the UUID shown in `mergify freeze list`.

## Deleting a Freeze

```bash
# Delete a scheduled (not yet active) freeze
mergify freeze delete FREEZE_ID

# Delete an active freeze (reason required)
mergify freeze delete FREEZE_ID --reason "Incident resolved"
```

If the freeze is currently active, a `--reason` for deletion is required.

## Common Patterns

### Emergency freeze during an incident
```bash
# Stop all merges immediately
mergify freeze create \
  --reason "Incident #1234 - API outage" \
  --timezone UTC

# Once resolved, delete the freeze
mergify freeze list --json  # Get the freeze ID
mergify freeze delete FREEZE_UUID --reason "Incident #1234 resolved"
```

### Recurring deployment window
Create the freeze before each deployment window and delete it after:
```bash
mergify freeze create \
  --reason "Deploy window" \
  --timezone "US/Pacific" \
  --start "2024-12-20T14:00:00" \
  --end "2024-12-20T16:00:00"
```

### Freeze with exceptions for critical fixes
```bash
mergify freeze create \
  --reason "Sprint freeze" \
  --timezone UTC \
  -c "base=main" \
  -e "label=hotfix" \
  -e "label=security"
```
