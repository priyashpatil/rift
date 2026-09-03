---
title: "Configuration"
description: "Complete reference for rift.yaml and global config files."
aliases:
  - /config/
---

Rift uses a two-level configuration system: a **per-project** `rift.yaml` and an optional **global** config. Project settings always take precedence.

## rift.yaml

Created by `rift init` at the root of your git repository. This is the primary config file.

```yaml
# AI coding agent to launch in new worktrees (any CLI command).
# Examples: codex, amp, claude, opencode, aider, copilot
agent: codex

# Lifecycle hooks — shell commands that run on worktree events.
hooks:
  open: bash scripts/bootstrap.sh
  jump: bash scripts/bootstrap.sh
  close: echo "closing $RIFT_WORKTREE"
  purge: echo "purging $RIFT_WORKTREE"
```

### Fields

#### `agent`

The CLI command launched inside new worktrees on `rift open` and `rift jump`. Can be any command available in your `$PATH`.

```yaml
# Single command
agent: codex
```

```yaml
# Alternate command
agent: amp
```

```yaml
# Command with arguments
agent: claude --model opus
```

**Default:** `codex`

#### `hooks`

Shell commands that run at worktree lifecycle events. Each value is passed to `bash -c`.

| Hook | Runs when | Skippable |
|------|-----------|-----------|
| `open` | After a new worktree is created | `--skip-hooks` |
| `jump` | After switching to a worktree | `--skip-hooks` |
| `close` | Before a worktree is removed | `--skip-hooks` |
| `purge` | Before each worktree during purge | No |

All hooks receive:
- **Working directory** — the worktree path (e.g. `~/.rift/worktrees/my-project/bold-ant`)
- **`RIFT_WORKTREE`** environment variable — the worktree name (e.g. `bold-ant`)

Hook failures are **non-blocking** — a non-zero exit code is logged as a warning but does not stop the operation.

See the [Hooks](/legacy/hooks/) page for common patterns and the bootstrap recipe.

---

## Global config

Optional. Stored at `~/.config/rift/config.yaml`. Sets default values for `agent` that are used by `rift init` when creating new projects.

```yaml
agent: codex
```

Set it with:

```bash
rift config --global --agent codex
```

### Fields

#### `agent`

Default agent command for new projects. Used as the default when running `rift init`.

---

## Precedence

When resolving `agent`, Rift checks in order:

1. Project `rift.yaml`
2. Global `~/.config/rift/config.yaml`
3. Built-in default (`codex`)

The first value found wins. `hooks` are only supported in the project-level `rift.yaml`.
