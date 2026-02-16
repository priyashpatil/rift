---
title: "Rift — Git Worktree Manager for AI Agents"
description: "Git worktree manager for parallel AI agent development."
---

**Git worktree manager for parallel AI agent development.**

Spin up isolated git worktrees, each with its own branch, and automatically launch an AI coding agent inside them. Work on multiple features simultaneously without stashing or switching branches.

## Install

```bash
npm install -g @priyashpatil/rift
```

Or try it without installing:

```bash
npx @priyashpatil/rift
```

Then run `rift configure` to set up shell integration and global preferences, and `rift init` inside a git project to create a `rift.yaml`. See the [Getting Started guide](/guides/getting-started/) for the full walkthrough.

## Supported editors

VS Code, Cursor, and Windsurf. All three support managed workspaces — `rift code` creates a `.code-workspace` file that includes all active worktrees.

> **JetBrains IDEs and Zed** have multi-root workspace support that is either in early stages or only partially implemented. Rift does not have built-in support for these editors at the moment. You can still use them by setting a custom editor command in `rift.yaml`, but `rift code` won't manage a shared workspace file for them.

## Supported agents

Amp, Claude Code, Codex, Continue, Copilot, Gemini, Kiro, and OpenCode.
