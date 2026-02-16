---
title: "Lifecycle Hooks"
description: "Configure lifecycle hooks in rift.yaml to run commands on worktree events."
---

Run `rift init` inside a git project to create a `rift.yaml` at the repo root. This file configures per-project settings and lifecycle hooks.

## Project Overrides

You can override the global `editor` and `agent` settings on a per-project basis:

```yaml
editor: cursor
agent: claude
hooks:
  open: "bun install"
```

- **`editor`** — the editor command to use for this project (e.g. `code`, `cursor`, `windsurf`). Overrides the global config.
- **`agent`** — the coding agent command to use for this project (e.g. `claude`, `aider`, `codex`). Overrides the global config.

## Hooks

Run commands on lifecycle events:

```yaml
hooks:
  open: "bun install"
  jump: "bun install"
  close: "echo closing worktree"
  purge: "echo purging all"
```

- **`open`** — runs after a new worktree is created
- **`jump`** — runs after switching to a worktree
- **`close`** — runs before a worktree is removed
- **`purge`** — runs before each worktree is removed during purge

## How Hooks Work

- Hooks are defined in `rift.yaml` at the root of your repository.
- Each hook value is passed to `bash -c`, so you can use any shell syntax.
- Hooks run **synchronously** — Rift waits for the command to finish before continuing.
- The working directory is the worktree directory (e.g. `~/.rift/worktrees/my-project/bold-ant`).
- The environment variable `RIFT_WORKTREE` is set to the worktree name (e.g. `bold-ant`).

## Common Patterns

**Install dependencies on open/jump:**

```yaml
hooks:
  open: "npm install"
  jump: "npm install"
```

**Chain multiple commands:**

```yaml
hooks:
  open: "npm install && npm run db:migrate"
```

**Call a script file:**

```yaml
hooks:
  open: "bash scripts/bootstrap.sh"
```

This keeps complex setup logic out of `rift.yaml` and in a version-controlled script.

## The Bootstrap Pattern

When multiple worktrees run dev servers simultaneously, they all compete for the same default ports. The bootstrap pattern solves this by running a command on the `open` and `jump` hooks that derives a **deterministic port** from the worktree name — the same worktree always gets the same port.

### Quick setup

`rift init` offers to set up the bootstrap pattern for you. It can generate a ready-made bash script or let you enter any custom command (e.g. `npm run bootstrap`).

### Bash script example

If you chose to generate a bash script during `rift init`, or want to create one manually:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Derive a deterministic port from the worktree name.
# The same worktree always gets the same port (range 3000–9999).
hash=$(echo -n "$RIFT_WORKTREE" | shasum | tr -d 'a-f ' | cut -c1-4)
PORT=$(( (hash % 7000) + 3000 ))

echo "PORT=$PORT" > .env
echo "Assigned port $PORT for worktree '$RIFT_WORKTREE'"
```

The formula strips hex letters from the SHA hash, takes the first 4 digits, and maps them into the range 3000–9999.

### Custom commands

The hook command doesn't have to be a bash script — it can be any command your project supports. For example:

```yaml
hooks:
  open: "npm run bootstrap"
  jump: "npm run bootstrap"
```

```yaml
hooks:
  open: "node scripts/setup.js"
  jump: "node scripts/setup.js"
```

The `RIFT_WORKTREE` environment variable is available in all hook commands.

### Multiple ports

If your project runs several services (frontend, API, database), derive multiple ports from the same base:

```bash
#!/usr/bin/env bash
set -euo pipefail

hash=$(echo -n "$RIFT_WORKTREE" | shasum | tr -d 'a-f ' | cut -c1-4)
BASE=$(( (hash % 7000) + 3000 ))

cat > .env <<EOF
PORT=$BASE
API_PORT=$(( BASE + 1 ))
DB_PORT=$(( BASE + 2 ))
EOF

echo "Assigned ports $BASE, $(( BASE + 1 )), $(( BASE + 2 )) for worktree '$RIFT_WORKTREE'"
```

### Wiring it up

If you didn't use `rift init` to set up the bootstrap pattern, add the hook command to your `rift.yaml` manually:

```yaml
hooks:
  open: "bash scripts/bootstrap.sh"
  jump: "bash scripts/bootstrap.sh"
```

Running on both `open` and `jump` ensures the `.env` file is always present, even if the worktree was created before the script existed.

### .gitignore

The generated `.env` file is worktree-specific and should not be committed:

```
# .gitignore
.env
```

`rift init` adds this automatically when you enable the bootstrap pattern.

### Next steps

See the [framework guides](/guides/) for step-by-step examples of reading the assigned port, configuring databases, and wiring up hooks, and the [Docker Compose guide](/guides/docker-compose/) for isolating containerized services across worktrees.
