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

VS Code, Cursor, Windsurf, IntelliJ IDEA, WebStorm, GoLand, PyCharm, PhpStorm, CLion, RubyMine, Rider, RustRover, Aqua, and DataGrip.

VS Code, Cursor, and Windsurf support managed workspaces — `rift code` creates a `.code-workspace` file that includes all active worktrees.

## Supported agents

Claude Code, Amp, OpenAI Codex, Aider, and Gemini CLI.
