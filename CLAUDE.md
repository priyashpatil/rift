# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rift is a Git worktree manager CLI for parallel AI agent development. It creates isolated git worktrees with their own branches and launches AI coding agents, enabling simultaneous feature work without branch switching. Built with Bun, compiled to standalone binaries, published as `@priyashpatil/rift`.

## Commands

```bash
bun run dev              # Run CLI from source (bun run src/index.ts)
bun run build            # Build standalone binary
bun run build:dev        # Build + copy to ~/.local/bin/rift
bun test                 # Run tests (vitest)
bun test -- src/__tests__/git.test.ts  # Run a single test file
bun run test:coverage    # Tests with v8 coverage
bun run check            # Lint + format check (CI gate)
bun run lint:fix         # Auto-fix lint issues
bun run format           # Auto-format with Prettier
```

## Architecture

**Runtime:** Bun (ES modules, TypeScript). Uses Bun APIs directly: `Bun.spawn()` for processes, `Bun.which()` for path lookup, `Bun.sleep()` for delays.

**CLI routing:** `src/index.ts` is a switch-statement router that dispatches to command functions in `src/commands/`. Commands prefixed with `_` are internal (used by shell integration).

**Key modules:**
- `src/config.ts` — Config cascade: project `rift.yaml` → global `~/.config/rift/config.yaml` → defaults
- `src/git.ts` — All git operations via `Bun.spawn(["git", ...])`, safe CWD handling
- `src/agents.ts` — Agent process registration/tracking via JSON files in `~/.rift/agents/`
- `src/ipc.ts` — Cross-process communication via temp files (`/tmp/.rift_*`) for shell ↔ binary signaling
- `src/workspace.ts` — VS Code/Cursor/Windsurf workspace file generation
- `src/hooks.ts` — Lifecycle hooks (open/jump/close/purge) run via `bash -c`

**Worktree lifecycle:** open (create branch → worktree → hook → sync workspace → signal agent) → jump (hook → signal) → close (hook → remove worktree → delete branch → sync workspace)

**Shell integration:** `rift _shell-init` outputs shell wrapper functions (bash/zsh/fish) that read temp files to handle directory changes and agent spawning after the binary exits.

## Testing

Tests use Vitest (not Bun's test runner). A setup file (`src/__tests__/setup.ts`) polyfills Bun APIs for Node.js since Vitest runs on Node. Tests mirror the `src/` structure and use vi.mock() extensively for file I/O and git operations.

## Conventions

- Conventional commits required (`feat:`, `fix:`, etc.) — semantic-release automates versioning
- Only runtime dependency is `js-yaml`
- ESLint: unused vars prefixed with `_` are allowed; `any` types allowed in test files
- Cross-platform builds: darwin arm64/x64, linux x64/arm64
