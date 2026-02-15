---
title: "Command Reference"
description: "CLI reference for all Rift commands and options."
---

### `rift configure`

Set up shell integration and global preferences. This does three things:

1. Detects your shell and adds the Rift shell wrapper to your RC file.
2. Prompts for a default editor.
3. Prompts for a default AI agent.

```bash
rift configure
```

You can re-run it at any time to change your editor or agent.

### `rift init`

Initialize a `rift.yaml` in the current git project. The editor and agent default to your global config.

```bash
# Use global defaults
rift init

# Override editor
rift init --editor cursor

# Override agent
rift init --agent aider

# Override both
rift init --editor cursor --agent aider
```

During init, Rift offers to set up the [bootstrap pattern](/hooks/#the-bootstrap-pattern) for deterministic dev server ports. You can generate a bash script or enter a custom command (e.g. `npm run bootstrap`). See [Hooks](/hooks/) for details.

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

Open the project in your configured editor. For editors with workspace support (VS Code, Cursor, Windsurf), this creates a `.code-workspace` file containing all active worktrees as folders.

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

## Options

These flags can be combined with the commands above:

- **`--base <branch>`** (`open`) — base branch for the new worktree (default: current branch)
- **`--skip-agent`** (`open`, `jump`) — don't launch the AI agent after switching
- **`--editor <cmd>`** (`init`) — editor to use for the project
- **`--agent <cmd>`** (`init`) — AI agent to use for the project
- **`-f`, `--force`** (`close`, `purge`) — skip confirmation prompts
