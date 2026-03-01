---
title: "Rift — Git Worktree Manager for AI Agents"
description: "Git worktree manager for parallel AI agent development."
---

# Git worktree manager for parallel AI agent development.

Spin up isolated git worktrees, each with its own branch, and automatically launch an AI coding agent inside them. Work on multiple features simultaneously without stashing or switching branches.

## Install

```bash
npm install -g @priyashpatil/rift
```

Or try it without installing:

```bash
npx @priyashpatil/rift
```

Then run `rift config` to set up shell integration, and `rift init` inside a git project to create a `rift.yaml`. See the [Getting Started guide](/guides/getting-started/) for the full walkthrough.

## Features

- **Work on everything at once** — every task gets its own isolated worktree and branch, so you never stash, switch, or wait again
- **Bring any agent** — Claude Code, Copilot, Codex, Aider, or any CLI command — just plug it in
- **Zero port conflicts** — deterministic hash-based port mapping means every worktree runs services simultaneously without collisions
- **Hooks that handle the busywork** — auto-install deps, seed databases, assign ports — all triggered by worktree lifecycle events
- **One workspace, all worktrees** — `rift code` opens every active worktree in a single VS Code, Cursor, or Windsurf workspace
- **Launch and go** — `rift open` creates the branch, sets up the worktree, and drops you in with your agent running

## Supported editors

VS Code, Cursor, and Windsurf. All three support managed workspaces — `rift code` creates a `.code-workspace` file that includes all active worktrees.

> **JetBrains IDEs and Zed** have multi-root workspace support that is either in early stages or only partially implemented. Rift does not have built-in support for these editors at the moment. You can still use them by setting a custom editor command in `rift.yaml`, but `rift code` won't manage a shared workspace file for them.

## Supported agents

Any CLI agent works — just set the command in `rift.yaml`. Common agents include Amp, Claude Code, Codex, Continue, Copilot, Gemini, Kiro, and OpenCode, but you can use any command (e.g. `aider`, `claude --model opus`, or a custom script).
