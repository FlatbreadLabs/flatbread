---
name: mergify-config
description: Use Mergify config commands to validate configuration files, simulate Mergify actions, and write Mergify configuration. ALWAYS use this skill when validating, writing, editing, or simulating Mergify config. Triggers on config validate, config simulate, mergify configuration, mergify.yml, .mergify.yml, merge queue config, workflow rules, conditions.
---

# Mergify Configuration Management

## Overview

The `mergify config` command group provides tools for validating Mergify configuration files against the official schema and simulating what Mergify would do on a specific pull request using a local configuration file.

## Commands

```bash
mergify config validate                              # Validate the configuration file
mergify config simulate PULL_REQUEST_URL             # Simulate actions on a PR
```

## Configuration File Detection

Mergify CLI auto-detects the configuration file from standard locations:
- `.mergify.yml`
- `.mergify/config.yml`
- `.github/mergify.yml`

Override with `--config-file` / `-f`:
```bash
mergify config -f path/to/config.yml validate
```

## Validating Configuration (`validate`)

Validates the Mergify configuration file against the official JSON schema fetched from `https://docs.mergify.com/mergify-configuration-schema.json`.

```bash
# Validate auto-detected config file
mergify config validate

# Validate a specific file
mergify config -f .mergify.yml validate
```

**Output:**
- If valid: prints a success message and exits with code 0
- If invalid: prints the number of errors and each error's path and message, then exits with code 1

**Use in CI:**
```yaml
- name: Validate Mergify config
  run: mergify config validate
```

## Simulating Actions (`simulate`)

Simulates what Mergify would do on a specific pull request using the local configuration file. This lets you test configuration changes before committing them.

```bash
mergify config simulate https://github.com/owner/repo/pull/123
```

**Required arguments:**
- `PULL_REQUEST_URL` -- Full GitHub URL of the pull request to simulate against

**Options:**
- `--token` / `-t` (env: `MERGIFY_TOKEN` or `GITHUB_TOKEN`) -- Authentication token
- `--api-url` / `-u` (env: `MERGIFY_API_URL`) -- Mergify API URL (default: `https://api.mergify.com`)

**Output:** Shows a title and detailed Markdown summary of what actions Mergify would take on the PR with the local configuration.

## Writing and Editing Configuration

When helping a user write, edit, or understand a Mergify configuration file,
**always fetch the relevant documentation pages first**. Do not rely on
memorized knowledge -- the configuration format, available actions, and
conditions syntax evolve over time.

### Documentation index

Fetch `https://docs.mergify.com/llms.txt` to get the full documentation index
with all available pages and their descriptions.

### Key reference pages

Fetch the pages relevant to the user's request before writing any configuration:

| Topic | URL |
|-------|-----|
| File format and structure | `https://docs.mergify.com/configuration/file-format` |
| Conditions syntax and attributes | `https://docs.mergify.com/configuration/conditions` |
| Data types (duration, templates) | `https://docs.mergify.com/configuration/data-types` |
| Configuration sharing and reuse | `https://docs.mergify.com/configuration/sharing` |
| Workflow automation overview | `https://docs.mergify.com/workflow` |
| All available actions | `https://docs.mergify.com/workflow/actions` |
| Writing your first rule | `https://docs.mergify.com/workflow/writing-your-first-rule` |
| Merge queue rules | `https://docs.mergify.com/merge-queue/rules` |
| Merge queue setup | `https://docs.mergify.com/merge-queue/setup` |
| Queue priority rules | `https://docs.mergify.com/merge-queue/priority` |
| Merge protections | `https://docs.mergify.com/merge-protections/setup` |
| Custom protection rules | `https://docs.mergify.com/merge-protections/custom-rules` |
| Merge protection examples | `https://docs.mergify.com/merge-protections/examples` |
| Commands and restrictions | `https://docs.mergify.com/commands` |
| JSON Schema | `https://docs.mergify.com/mergify-configuration-schema.json` |

For individual actions (assign, backport, close, comment, copy, dismiss_reviews,
edit, github_actions, label, merge, queue, rebase, request_reviews, review,
squash, update), fetch the specific action page at
`https://docs.mergify.com/workflow/actions/<action_name>`.

### Workflow

1. **Read the user's existing config** (if any) to understand current state
2. **Fetch the relevant doc pages** for the features the user needs
3. **Write or update the configuration** based on the documentation
4. **Validate**: run `mergify config validate` to check for errors
5. **Simulate** (optional): run `mergify config simulate <PR_URL>` against a
   real PR to verify the rules behave as expected

## Common Patterns

### Test config changes before pushing
```bash
# Edit your .mergify.yml locally, then:
mergify config validate
mergify config simulate https://github.com/myorg/myrepo/pull/42
# If both look good, commit and push
```

### CI validation gate
```yaml
jobs:
  validate-mergify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install mergify-cli
        run: pip install mergify-cli
      - name: Validate Mergify config
        run: mergify config validate
```
