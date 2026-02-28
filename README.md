# Rift

[![Known Vulnerabilities](https://snyk.io/test/github/priyashpatil/rift/badge.svg)](https://snyk.io/test/github/priyashpatil/rift)
[![codecov](https://codecov.io/gh/priyashpatil/rift/graph/badge.svg)](https://codecov.io/gh/priyashpatil/rift)
[![npm version](https://img.shields.io/npm/v/@priyashpatil/rift)](https://www.npmjs.com/package/@priyashpatil/rift)

Git worktree manager for parallel AI agent development.

Rift lets you spin up isolated git worktrees, each with its own branch, and automatically launch an AI coding agent inside them. Work on multiple features simultaneously without stashing or switching branches.

## Features

- **Isolated worktrees** — each task gets its own directory and branch under `~/.rift/worktrees/`
- **Any AI agent** — configure any CLI command as your agent (`claude`, `aider`, `copilot`, a custom script, etc.)
- **Truly parallel services** — hash-based port mapping gives each worktree deterministic, collision-free ports so services run simultaneously
- **Lifecycle hooks** — run commands on worktree events (install deps, set up databases, assign ports)
- **Editor workspaces** — `rift code` creates a `.code-workspace` file with all active worktrees
- **Shell integration** — `cd`s you into worktrees and launches agents automatically

## Install

```bash
npm install -g @priyashpatil/rift
```

Or try it without installing:

```bash
npx @priyashpatil/rift
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

VS Code, Cursor, and Windsurf. All three support managed workspaces via `rift code`.

## Supported Agents

Any CLI command works. Set it in `rift.yaml` or via `rift config --agent <cmd>`. Common agents include Claude Code, Copilot, Codex, Aider, Amp, Gemini, Kiro, and OpenCode.

## Documentation

Full documentation including command reference, lifecycle hooks, and framework-specific guides is available at the [docs site](https://rift.priyashpatil.com).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, commit conventions, and code style.

## License

MIT
