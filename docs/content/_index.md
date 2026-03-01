---
title: "Rift — Git Worktree Manager for AI Agents"
description: "Git worktree manager for parallel AI agent development."
headline: "Git worktree manager for AI agents"
tagline: "Isolated worktrees with their own branches, each running an AI coding agent. Work on multiple features simultaneously — no stashing, no switching."
video_src: ""
features:
  - title: "Work on everything at once"
    description: "Every task gets its own isolated worktree and branch, so you never stash, switch, or wait again."
  - title: "Bring any agent"
    description: "Claude Code, Copilot, Codex, Aider, or any CLI command — just plug it in."
  - title: "Zero port conflicts"
    description: "Deterministic hash-based port mapping means every worktree runs services simultaneously without collisions."
  - title: "Hooks that handle the busywork"
    description: "Auto-install deps, seed databases, assign ports — all triggered by worktree lifecycle events."
  - title: "One workspace, all worktrees"
    description: "rift code opens every active worktree in a single VS Code, Cursor*, or Windsurf workspace."
  - title: "Launch and go"
    description: "rift open creates the branch, sets up the worktree, and drops you in with your agent running."
---

## Supported editors

VS Code, Cursor\*, and Windsurf. All three support managed workspaces — `rift code` creates a `.code-workspace` file that includes all active worktrees.

\*Cursor is a VS Code fork and supports `.code-workspace` files, but has known rough edges — particularly around file association on macOS and multi-root workspace context for AI features.

> **JetBrains IDEs and Zed** have multi-root workspace support that is either in early stages or only partially implemented. Rift does not have built-in support for these editors at the moment. You can still use them by setting a custom editor command in `rift.yaml`, but `rift code` won't manage a shared workspace file for them.

## Supported agents

Any CLI agent works — just set the command in `rift.yaml`. Common agents include Amp, Claude Code, Codex, Continue, Copilot, Gemini, Kiro, and OpenCode, but you can use any command (e.g. `aider`, `claude --model opus`, or a custom script).
