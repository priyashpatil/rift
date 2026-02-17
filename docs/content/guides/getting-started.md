---
title: "Getting Started with Rift"
description: "Install Rift, configure your editor and agent, and open your first worktree."
weight: 1
---

## 1. Install

```bash
npm install -g @priyashpatil/rift
```

Or try it without installing:

```bash
npx @priyashpatil/rift
```

## 2. Shell integration

Run `rift config` once after installing. It detects your shell and adds a one-liner to your RC file (`.zshrc`, `.bashrc`, or `config.fish`) so Rift can `cd` you into worktrees automatically.

```bash
rift config
```

```
Shell integration added to /Users/you/.zshrc
  editor: VS Code [code]
  agent:  Claude Code [claude]
```

Restart your shell after the first run to load shell integration.

## 3. Initialize a project

Inside any git repository, run `rift init` to create a `rift.yaml` config file at the repo root.

```bash
cd my-project
rift init
```

The editor defaults to VS Code and the agent to Claude Code. Override with flags:

```bash
rift init --editor cursor --agent copilot
```

The result is a `rift.yaml` committed to your repo:

```yaml
editor: code
agent: claude
hooks:
  # open: bash scripts/bootstrap.sh
  # jump: bash scripts/bootstrap.sh
  # close: echo "closing $RIFT_WORKTREE"
  # purge: echo "purging $RIFT_WORKTREE"
```

Hooks are commented out by default. Uncomment and customize them to run commands on worktree lifecycle events — see [Hooks](/hooks/) for details and the [bootstrap pattern](/hooks/#the-bootstrap-pattern) for deterministic dev server ports.

To change settings later, use `rift config`:

```bash
# Update the project config (rift.yaml)
rift config --editor cursor --agent copilot

# Update global defaults (for new projects)
rift config --global --editor cursor
```

## 4. Open a worktree

`rift open` creates a new worktree, branches off the current branch, and launches your configured agent inside it.

```bash
rift open             # auto-generates a name
rift open auth-flow   # use a specific name
```

```
Created worktree: auth-flow
Branch: auth-flow (based on main)
Path: ~/.rift/worktrees/my-project/auth-flow
```

What happens under the hood:

1. A new git worktree is created under `~/.rift/worktrees/<project>/<name>`.
2. A branch with the same name is created from the current branch (override with `--base`).
3. The `open` hook runs if configured.
4. Your shell `cd`s into the new worktree.
5. Your AI agent starts automatically (skip with `--skip-agent`).

Open as many worktrees as you like — each one is a fully isolated copy of the repo with its own branch.

## 5. Close a worktree

When you're done, `rift close` removes the worktree and deletes its branch. Run it from inside the worktree you want to close.

```bash
rift close
```

```
Close worktree "auth-flow" and delete branch? [y/N] y
Removed worktree: auth-flow
Deleted branch: auth-flow
```

Your shell is returned to the main repository. Use `-f` to skip the confirmation prompt.

---

## Other commands

| Command | Description |
|---------|-------------|
| `rift status` | Show current context (project, worktree, branch) |
| `rift list` | List all worktrees for the current project |
| `rift jump <name>` | Switch to a worktree and start the agent |
| `rift main` | Switch back to the main repository |
| `rift code` | Open the project in your configured editor |
| `rift purge` | Remove all worktrees for the current project |

## How it works

Rift manages [git worktrees](https://git-scm.com/docs/git-worktree) under `~/.rift/worktrees/`. Each worktree gets its own directory and branch, completely isolated from your main checkout.

A shell wrapper (installed by `rift config`) intercepts the `rift` command so it can change your working directory and launch agents — things a child process can't do on its own. The wrapper is loaded via `eval "$(rift _shell-init)"` in your RC file.

## Configuration

Rift has two levels of configuration: **global** (your machine) and **per-project** (your repository).

### Per-project config

`rift.yaml` at the repo root, created by `rift init`. This is the primary config file.

```yaml
editor: code
agent: claude
hooks:
  # open: bash scripts/bootstrap.sh
  # jump: bash scripts/bootstrap.sh
```

Change settings with `rift config --editor cursor` or edit the file directly. See the [Hooks](/hooks/) page for the full reference and patterns.

### Global config

Optional. Stored at `~/.config/rift/config.yaml`. Sets defaults for `rift init` when creating new projects. Project-level `rift.yaml` always takes precedence.

```bash
rift config --global --editor cursor --agent copilot
```
