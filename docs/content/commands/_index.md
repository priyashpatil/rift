---
title: "Command Reference"
description: "CLI reference for all Rift commands and options."
---

### `rift config`

Set up shell integration and configure preferences. By default writes to the project-level `rift.yaml`. Use `--global` to set global defaults.

```bash
# Set up shell integration and show current config
rift config

# Set editor in project config (rift.yaml)
rift config --editor cursor

# Set agent in project config (any CLI command)
rift config --agent claude
rift config --agent "aider --model gpt-4"

# Set global defaults (for new projects)
rift config --global --editor cursor --agent claude
```

Running without flags detects your shell, adds the Rift shell wrapper to your RC file, and prints the current editor and agent. Use `--editor` and `--agent` flags to change them. A `rift.yaml` must exist for project-level changes — run `rift init` first.

### `rift init`

Initialize a `rift.yaml` in the current git project. The editor defaults to VS Code and the agent to Claude Code, unless overridden by global config.

```bash
# Use global defaults
rift init

# Override editor
rift init --editor cursor

# Override agent (any CLI command)
rift init --agent aider

# Override both
rift init --editor cursor --agent aider
```

The generated `rift.yaml` includes commented-out hook examples. See [Hooks](/hooks/) for details on configuring lifecycle hooks.

### `rift status`

Show current context — project name, branch, and whether you're in a worktree or the main repo.

```bash
rift status
```

### `rift open [name]`

Create a new worktree and launch your configured AI agent inside it.

```bash
# Auto-generate a name
rift open

# Specify a name
rift open my-feature

# Branch off a specific base
rift open my-feature --base develop

# Skip launching the agent
rift open my-feature --skip-agent

# Skip running hooks
rift open my-feature --skip-hooks
```

If no name is given, Rift generates a random one (e.g. `bold-eagle`).

### `rift list`

List all worktrees for the current project. The base (main) workspace is always shown first, followed by Rift-managed worktrees. The active worktree is marked with `*`.

```bash
rift list
```

Alias: `rift ls`

### `rift jump <name>`

Switch to an existing worktree and start the agent. Use `base` (or `main`) to jump to the main repository.

```bash
rift jump my-feature

# Jump to the main repository
rift jump base

# Jump without launching the agent
rift jump my-feature --skip-agent

# Jump without running hooks
rift jump my-feature --skip-hooks
```

### `rift close`

Close the current worktree, delete its branch, and return to the main repo.

```bash
rift close

# Skip the confirmation prompt
rift close --force

# Close without running hooks
rift close --skip-hooks
```

Must be run from inside a Rift worktree (not the main repo).

### `rift code`

Open the project in your configured editor. Creates a `.code-workspace` file containing all active worktrees as folders.

```bash
rift code
```

### `rift purge`

Remove **all** worktrees for the current project and delete their branches.

```bash
rift purge

# Skip confirmation
rift purge --force
```

### `rift update`

Update Rift to the latest version. Checks npm for a newer release, runs the install, and clears the update-check cache.

```bash
rift update
```

### `rift version`

Print the current Rift version.

```bash
rift version
```

Also available as `rift --version` or `rift -v`.

## Options

These flags can be combined with the commands above:

- **`--base <branch>`** (`open`) — base branch for the new worktree (default: current branch)
- **`--skip-agent`** (`open`, `jump`) — don't launch the AI agent after switching
- **`--skip-hooks`** (`open`, `jump`, `close`) — don't run lifecycle hooks
- **`--editor <cmd>`** (`init`, `config`) — editor to use
- **`--agent <cmd>`** (`init`, `config`) — AI agent command to use (any CLI command)
- **`-f`, `--force`** (`close`, `purge`) — skip confirmation prompts

Run `rift <command> --help` for more information on a specific command.
