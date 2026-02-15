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

## 2. Configure

Run `rift configure` once after installing. It does three things:

1. **Shell integration** — adds a one-liner to your shell RC file (`.zshrc`, `.bashrc`, or `config.fish`) so Rift can `cd` you into worktrees automatically.
2. **Default editor** — pick the editor Rift opens worktrees in. Supports VS Code, Cursor, Windsurf, and all JetBrains IDEs.
3. **Default agent** — pick the AI coding agent Rift launches in new worktrees. Supports Claude Code, Amp, OpenAI Codex, Aider, and Gemini CLI.

```bash
rift configure
```

```
Detected shell: zsh
RC file: /Users/you/.zshrc
Added shell integration to /Users/you/.zshrc

Which editor should Rift open worktrees in?
> VS Code [code]

Which AI coding agent should Rift launch in new worktrees?
> Claude Code [claude]

Configuration complete. Restart your shell to apply changes.
```

These defaults apply to all projects. You can override them per-project in the next step.

You can re-run `rift configure` at any time to change your defaults.

## 3. Initialize a project

Inside any git repository, run `rift init` to create a `rift.yaml` config file at the repo root.

```bash
cd my-project
rift init
```

The wizard walks you through:

- **Editor & agent** — inherited from your global config, or override with `--editor` and `--agent` flags.
- **Bootstrap pattern** — optionally generate a script that assigns a deterministic port to each worktree so dev servers don't collide. The script runs automatically on `open` and `jump` hooks.

The result is a `rift.yaml` committed to your repo:

```yaml
editor: code
agent: claude
hooks:
  open: bash scripts/bootstrap.sh
  jump: bash scripts/bootstrap.sh
```

You can also skip the wizard and pass flags directly:

```bash
rift init --editor cursor --agent aider
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

A shell wrapper (installed by `rift configure`) intercepts the `rift` command so it can change your working directory and launch agents — things a child process can't do on its own. The wrapper is loaded via `eval "$(rift _shell-init)"` in your RC file.

## Configuration

Rift has two levels of configuration: **global** (your machine) and **per-project** (your repository).

### Global config

Stored at `~/.config/rift/config.yaml`. Created by `rift configure`.

```yaml
editor: "code"
agent: "claude"
```

### Per-project config

`rift.yaml` at the repo root, created by `rift init`:

```yaml
editor: code
agent: claude
hooks: {}
```

This file lets you override the editor and agent for the project, and define [hooks](/hooks/) — shell commands that run on lifecycle events like creating, switching to, or removing a worktree. See the [Hooks](/hooks/) page for the full reference and patterns.
