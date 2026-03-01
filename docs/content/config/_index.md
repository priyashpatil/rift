---
title: "Configuration"
description: "Complete reference for rift.yaml and global config files."
---

Rift uses a two-level configuration system: a **per-project** `rift.yaml` and an optional **global** config. Project settings always take precedence.

## rift.yaml

Created by `rift init` at the root of your git repository. This is the primary config file.

```yaml
# Editor to open worktrees in.
# Options: code, cursor, windsurf
editor: code

# AI coding agent to launch in new worktrees (any CLI command).
# Examples: claude, aider, copilot, codex
agent: claude

# Extra folders to include in the generated .code-workspace file.
# Useful for monorepos or shared libraries outside your worktrees.
extra-workspaces:
  - /path/to/shared-lib
  - /path/to/design-system

# Lifecycle hooks — shell commands that run on worktree events.
hooks:
  open: bash scripts/bootstrap.sh
  jump: bash scripts/bootstrap.sh
  close: echo "closing $RIFT_WORKTREE"
  purge: echo "purging $RIFT_WORKTREE"
```

### Fields

#### `editor`

The editor command used by `rift code` to open your project.

| Value | Editor | Workspace managed |
|-------|--------|-------------------|
| `code` | VS Code | Yes |
| `cursor` | Cursor | Yes |
| `windsurf` | Windsurf | Yes |

Managed editors get a `.code-workspace` file (at `~/.rift/workspaces/<project>.code-workspace`) that is kept in sync with your active worktrees. Each worktree appears as a folder in the workspace.

**Default:** `code`

#### `agent`

The CLI command launched inside new worktrees on `rift open` and `rift jump`. Can be any command available in your `$PATH`.

```yaml
# Single command
agent: claude

# Command with arguments
agent: aider --model gpt-4
```

**Default:** `claude`

#### `extra-workspaces`

An optional list of absolute folder paths to append to the generated `.code-workspace` file. Folders are added after the main repository and all active worktrees.

```yaml
extra-workspaces:
  - /Users/you/projects/shared-ui
  - /Users/you/projects/api-types
```

This is useful when you have related code that lives outside the repository — shared libraries, monorepo packages, or design systems — and you want them visible alongside your worktrees in the editor sidebar.

Only applies to managed editors (VS Code, Cursor, Windsurf).

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

See the [Hooks](/hooks/) page for common patterns and the bootstrap recipe.

---

## Global config

Optional. Stored at `~/.config/rift/config.yaml`. Sets default values for `editor` and `agent` that are used by `rift init` when creating new projects.

```yaml
editor: cursor
agent: claude
```

Set it with:

```bash
rift config --global --editor cursor --agent claude
```

### Fields

#### `editor`

Default editor for new projects. Same values as the project-level `editor` field. Used as the default when running `rift init`.

#### `agent`

Default agent command for new projects. Used as the default when running `rift init`.

---

## Precedence

When resolving `editor` and `agent`, Rift checks in order:

1. Project `rift.yaml`
2. Global `~/.config/rift/config.yaml`
3. Built-in defaults (`code` for editor, `claude` for agent)

The first value found wins. `extra-workspaces` and `hooks` are only supported in the project-level `rift.yaml`.
