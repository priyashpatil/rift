# Contributing

Thanks for your interest in contributing to Rift!

## Development Setup

You'll need [Bun](https://bun.sh) installed.

```bash
git clone https://github.com/priyashpatil/rift.git
cd rift
bun install
```

### Running locally

```bash
# Run from source (no compile step)
bun run dev

# Build a binary and copy to ~/.local/bin
bun run build:dev
```

### Running tests

```bash
bun test

# With coverage
bun test --coverage
```

## Project Structure

```
src/
├── index.ts          # CLI router
├── commands/         # One file per command
├── config.ts         # Config loading (rift.yaml + global)
├── git.ts            # Git operations wrapper
├── hooks.ts          # Lifecycle hook runner
├── workspace.ts      # VS Code workspace sync
├── ipc.ts            # Shell ↔ CLI communication
├── names.ts          # Random name generator
├── prompt.ts         # Interactive prompts
├── constants.ts      # Paths and name lists
├── types.ts          # TypeScript interfaces
└── __tests__/        # Tests (mirrors src/ structure)
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning. Every commit to `main` is analyzed to determine the next version number and generate release notes.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Version Bump |
|------|-------------|-------------|
| `feat` | A new feature | Minor (`0.X.0`) |
| `fix` | A bug fix | Patch (`0.0.X`) |
| `docs` | Documentation only | None |
| `style` | Formatting, semicolons, etc. (no code change) | None |
| `refactor` | Code change that neither fixes a bug nor adds a feature | None |
| `perf` | Performance improvement | None |
| `test` | Adding or updating tests | None |
| `chore` | Build process, tooling, dependencies | None |

### Breaking Changes

Append `!` after the type or include `BREAKING CHANGE:` in the footer. This triggers a major version bump.

```
feat!: remove support for Node.js agent preset

BREAKING CHANGE: The agent field now expects a raw CLI command string
instead of a preset name.
```

### Scope (optional)

Use the scope to indicate what area of the codebase is affected:

- `open`, `close`, `jump`, `purge`, etc. — specific commands
- `config` — configuration system
- `hooks` — lifecycle hooks
- `git` — git operations
- `shell` — shell integration
- `docs` — documentation site

### Examples

```
feat(open): add --dry-run flag to preview worktree creation
fix(hooks): check exit code before continuing after hook failure
docs(hooks): document hook failure behavior
refactor(git): extract branch validation into helper
test(close): add tests for force-close with uncommitted changes
chore: bump bun to 1.2
```

## Pull Requests

1. Fork the repo and create a branch from `main`.
2. Make your changes. Add or update tests if the change affects behavior.
3. Run `bun test` and make sure all tests pass.
4. Use conventional commit messages (see above). If your PR has multiple commits, each should follow the convention.
5. Open a PR against `main` with a clear description of what changed and why.

## Code Style

- TypeScript with `strict` mode enabled.
- No external runtime dependencies unless absolutely necessary (currently only `js-yaml`).
- Each command lives in its own file under `src/commands/` and exports a single `cmd<Name>` function.
- Use `Bun.spawn()` for subprocesses, not `child_process`.
- Prefer early returns and guard clauses over nested conditionals.
- Tests go in `src/__tests__/` and mirror the source structure.
