---
name: mergify-ci
description: Use Mergify CI commands to upload JUnit test results, detect git references, manage CI scopes, and retrieve merge queue metadata. ALWAYS use this skill when working with CI pipelines, test result uploads, quarantine, scopes detection, or merge queue CI context. Triggers on CI, JUnit, test results, quarantine, scopes, git refs, CI insights.
---

# Mergify CI Commands

## Overview

The `mergify ci` command group provides tools for CI pipelines: uploading JUnit test results to Mergify CI Insights, detecting git references for diff-based operations, managing CI scopes for selective testing, and retrieving merge queue batch metadata.

## Commands

```bash
mergify ci junit-process FILES...         # Upload JUnit XML + evaluate quarantine (primary command)
mergify ci junit-upload FILES...          # (Deprecated) Use junit-process instead
mergify ci git-refs                       # Detect base/head git references for the current PR
mergify ci scopes --config PATH           # Detect scopes impacted by changed files
mergify ci scopes-send -s SCOPE           # Send scopes tied to a pull request to Mergify
mergify ci queue-info                     # Output merge queue batch metadata from the current PR event
```

## JUnit Processing (`junit-process`)

The primary CI command. Parses JUnit XML reports, checks quarantine status for failing tests, uploads results to Mergify CI Insights, and determines the final CI exit code.

```bash
mergify ci junit-process \
  --token "$MERGIFY_TOKEN" \
  --repository owner/repo \
  --tests-target-branch main \
  path/to/junit-results.xml
```

`FILES` can be individual paths or quoted glob patterns (e.g. `'reports/**/*.xml'`). Always quote the pattern so Mergify expands it rather than the shell — this is the recommended approach for large, sharded test suites.

**Key options:**
- `--token` / `-t` (env: `MERGIFY_TOKEN`) -- CI Insights application key
- `--repository` / `-r` -- Repository full name (auto-detected in GitHub Actions)
- `--tests-target-branch` / `-ttb` -- Branch used for quarantine evaluation. Auto-detected per CI provider: GitHub Actions (`GITHUB_BASE_REF` → `GITHUB_HEAD_REF` → `GITHUB_REF_NAME` → `GITHUB_REF`), Buildkite (`BUILDKITE_PULL_REQUEST_BASE_BRANCH` → `BUILDKITE_BRANCH`), CircleCI (`CIRCLE_BRANCH`), Jenkins (`CHANGE_TARGET` → `GIT_BRANCH`).
- `--api-url` / `-u` (env: `MERGIFY_API_URL`) -- Mergify API URL (default: `https://api.mergify.com`)
- `--test-framework` -- Test framework name (optional metadata)
- `--test-language` -- Test language (optional metadata)
- `--test-exit-code` / `-e` (env: `MERGIFY_TEST_EXIT_CODE`) -- Exit code of the test runner, used to detect silent failures where the runner crashed but the JUnit report appears clean

**Behavior:**
1. Parses JUnit XML files into test spans
2. Checks quarantine status for failing tests against the Mergify API
3. Uploads all test spans to Mergify CI Insights
4. Prints a summary: tests run, failures, quarantined vs blocking
5. Exits with code 0 if all failures are quarantined, code 1 if any are blocking
6. If `--test-exit-code` is non-zero but no test failures are found, exits with code 1 (silent failure detection)

**GitHub Actions example:**
```yaml
- name: Run tests
  id: tests
  run: pytest --junitxml=results.xml || echo "exit_code=$?" >> "$GITHUB_OUTPUT"

- name: Process test results
  if: always()
  run: |
    mergify ci junit-process \
      --test-exit-code ${{ steps.tests.outputs.exit_code || 0 }} \
      results.xml
  env:
    MERGIFY_TOKEN: ${{ secrets.MERGIFY_TOKEN }}
```

## Git References (`git-refs`)

Detects the base and head git references for the current pull request context. Writes results to `GITHUB_OUTPUT` when running in GitHub Actions, and to Buildkite meta-data (`mergify-ci.base`, `mergify-ci.head`, `mergify-ci.source`) when running in Buildkite.

```bash
mergify ci git-refs
# Output:
# Base: abc1234
# Head: def5678
```

**Output formats (`--format`):**
- `text` (default) — human-readable `Base:` / `Head:` lines
- `shell` — `MERGIFY_GIT_REFS_{BASE,HEAD,SOURCE}=...` lines suitable for `eval`, with POSIX-safe shell quoting. When base can't be detected, `MERGIFY_GIT_REFS_BASE=''`.
- `json` — single-line JSON object with `base`, `head`, `source` keys. `base` may be `null` when it can't be detected (e.g., `workflow_dispatch` events); use `jq -r '.base // ""'` to coalesce to empty string.

```bash
# Consume values in a shell script without parsing:
eval "$(mergify ci git-refs --format=shell)"
nx show projects --affected \
  --base="$MERGIFY_GIT_REFS_BASE" \
  --head="$MERGIFY_GIT_REFS_HEAD"

# Or with jq:
BASE=$(mergify ci git-refs --format=json | jq -r '.base // ""')
```

Sources detected (in priority order): merge queue context, GitHub pull request event, GitHub push event, fallback to last commit.

## Scopes (`scopes`)

Detects which CI scopes are impacted by changed files, based on a Mergify configuration file. Used for selective/targeted CI -- only run tests for scopes that have changed files.

```bash
# Detect scopes from changed files
mergify ci scopes --config .mergify.yml

# Detect scopes with explicit base/head
mergify ci scopes --config .mergify.yml --base origin/main --head HEAD

# Write detected scopes to a file
mergify ci scopes --config .mergify.yml --write scopes.json
```

**Key options:**
- `--config` (env: `MERGIFY_CONFIG_PATH`) -- Path to the Mergify YAML config file (auto-detected)
- `--base` -- Base git reference (auto-detected)
- `--head` -- Head git reference (default: HEAD)
- `--write` / `-w` -- Write detected scopes to a JSON file

The config file defines scopes with file patterns. When files change between base and head, matching scopes are identified and written to `GITHUB_OUTPUT` (on GitHub Actions) or to Buildkite meta-data under `mergify-ci.scopes` (on Buildkite), as a JSON map of scope names to `"true"`/`"false"`.

## Scopes Send (`scopes-send`)

Sends scopes tied to a pull request to the Mergify API. Used when scopes are determined manually or from a file rather than auto-detected.

```bash
# Send specific scopes
mergify ci scopes-send -s frontend -s backend -p 123

# Send scopes from a JSON file (produced by `mergify ci scopes --write`)
mergify ci scopes-send --scopes-json scopes.json -p 123

# Send scopes from a plain-text file (one scope per line)
mergify ci scopes-send --scopes-file scopes.txt -p 123
```

**Key options:**
- `--token` / `-t` (env: `MERGIFY_TOKEN`) -- Mergify key
- `--repository` / `-r` -- Repository full name (auto-detected)
- `--pull-request` / `-p` -- Pull request number (auto-detected in GitHub Actions)
- `--scope` / `-s` -- Scope name (repeatable)
- `--scopes-json` -- JSON file containing scopes (output of `mergify ci scopes --write`)
- `--scopes-file` -- Plain-text file with one scope per line

## Queue Info (`queue-info`)

Outputs merge queue batch metadata from the current pull request event. Only works on merge queue draft pull requests. Writes output to `GITHUB_OUTPUT` when running in GitHub Actions.

```bash
mergify ci queue-info
# Output: JSON with batch metadata
```

This command is useful in CI workflows that need to know whether the current run is part of a merge queue batch and what other PRs are in the batch.

## Common Patterns

### Full CI pipeline with quarantine
```yaml
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: pytest --junitxml=results.xml
      - name: Upload and evaluate
        if: always()
        run: mergify ci junit-process results.xml
        env:
          MERGIFY_TOKEN: ${{ secrets.MERGIFY_TOKEN }}
```

### Selective testing with scopes
```yaml
jobs:
  detect:
    outputs:
      scopes: ${{ steps.scopes.outputs.scopes }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: scopes
        run: mergify ci scopes --config .mergify.yml

  backend:
    needs: detect
    if: fromJSON(needs.detect.outputs.scopes).backend == 'true'
    steps:
      - run: pytest backend/
```
