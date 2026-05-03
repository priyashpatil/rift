# Rift

> Pacakge is Deprecated: Codex and Zed now has built in support for worktrees and I've also moved to Zed + Codex ACP so I won't be contributing to this. Feel free to fork and extend.

[![codecov](https://codecov.io/gh/priyashpatil/rift/graph/badge.svg)](https://codecov.io/gh/priyashpatil/rift)

Git worktree manager for parallel AI agent development.

Rift lets you spin up isolated git worktrees, each with its own branch, and automatically launch an AI coding agent inside them. Work on multiple features simultaneously without stashing or switching branches.

## Features

- **Work on everything at once** — every task gets its own isolated worktree and branch, so you never stash, switch, or wait again
- **Bring any agent** — Claude Code, Copilot, Codex, Aider, or any CLI command — just plug it in
- **Zero port conflicts** — deterministic hash-based port mapping means every worktree runs services simultaneously without collisions
- **Hooks that handle the busywork** — auto-install deps, seed databases, assign ports — all triggered by worktree lifecycle events
- **One workspace, all worktrees** — `rift code` opens every active worktree in a single VS Code, Cursor\*, or Windsurf workspace
- **Launch and go** — `rift open` creates the branch, sets up the worktree, and drops you in with your agent running

## Install

```bash
npm install -g @priyashpatil/rift
```

## Quick Start

```bash
# 1. Set up shell integration (one-time)
rift config

# 2. Restart your shell, then initialize a project
cd my-project
rift init

# 3. Open a worktree — creates a branch and launches your agent
rift open

# 4. When done, close the worktree and delete its branch
rift close
```

## Supported Editors

VS Code, Cursor\*, and Windsurf. All three support managed workspaces via `rift code`.

\*Cursor is a VS Code fork and supports `.code-workspace` files, but has known rough edges — particularly around file association on macOS and multi-root workspace context for AI features.

## Supported Agents

Any CLI command works. Set it in `rift.yaml` or via `rift config --agent <cmd>`. Common agents include Claude Code, Copilot, Codex, Aider, Amp, Gemini, Kiro, and OpenCode.

## Documentation

Full documentation including command reference, lifecycle hooks, and framework-specific guides is available at the [docs site](https://rift.priyashpatil.com).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, commit conventions, and code style.

## License

MIT
