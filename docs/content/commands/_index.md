---
title: "Command Reference"
description: "CLI reference for all Rift commands and options."
---

### `rift configure`

Set up shell integration and global preferences.

```bash
# Set up shell integration and show current config
rift configure

# Set default editor
rift configure --editor cursor

# Set default agent
rift configure --agent copilot

# Set both
rift configure --editor cursor --agent copilot
```

Running without flags detects your shell, adds the Rift shell wrapper to your RC file, and prints the current editor and agent. Use `--editor` and `--agent` flags to change them.

### `rift init`

Initialize a `rift.yaml` in the current git project. The editor and agent default to your global config.

```bash
# Use global defaults
rift init

# Override editor
rift init --editor cursor

# Override agent
rift init --agent copilot

# Override both
rift init --editor cursor --agent copilot
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
```

If no name is given, Rift generates a random one (e.g. `bold-eagle`).

### `rift list`

List all Rift-managed worktrees for the current project. The active worktree is marked with `*`.

```bash
rift list
```

Alias: `rift ls`

### `rift jump <name>`

Switch to an existing worktree and start the agent.

```bash
rift jump my-feature

# Jump without launching the agent
rift jump my-feature --skip-agent
```

### `rift close`

Close the current worktree, delete its branch, and return to the main repo.

```bash
rift close

# Skip the confirmation prompt
rift close --force
```

Must be run from inside a Rift worktree (not the main repo).

### `rift main`

Switch back to the main repository from any worktree.

```bash
rift main
```

Alias: `rift base`

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
- **`--editor <cmd>`** (`init`, `configure`) — editor to use
- **`--agent <cmd>`** (`init`, `configure`) — AI agent to use
- **`-f`, `--force`** (`close`, `purge`) — skip confirmation prompts

Run `rift <command> --help` for more information on a specific command.
