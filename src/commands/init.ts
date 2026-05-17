import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { isGitRepo, getMainWorktree } from "../git";
import { getGlobalConfig } from "../config";

function parseFlags(args: string[]): { agent?: string } {
  const flags: { agent?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--agent" && args[i + 1]) {
      flags.agent = args[++i];
    }
  }
  return flags;
}

function generateConfig(agent: string): string {
  return `# Rift project configuration
# Docs: https://rift.priyashpatil.com/hooks/

# AI coding agent to launch in new worktrees (any CLI command).
# Examples: codex, amp, claude, opencode, aider, copilot
agent: ${agent}

# Hooks run shell commands at worktree lifecycle events.
# The RIFT_WORKTREE environment variable is set to the branch name.
hooks:
  # Runs when a worktree is created or opened.
  # open: bash scripts/bootstrap.sh

  # Runs when you jump to an existing worktree.
  # jump: bash scripts/bootstrap.sh

  # Runs before a worktree is closed.
  # close: echo "closing $RIFT_WORKTREE"

  # Runs before stale worktrees are purged.
  # purge: echo "purging $RIFT_WORKTREE"
`;
}

export async function cmdInit(args: string[]): Promise<void> {
  if (!(await isGitRepo())) {
    throw new Error("not a git repository. Run this inside a git project.");
  }

  const mainRepo = await getMainWorktree();
  const configPath = join(mainRepo, "rift.yaml");

  if (existsSync(configPath)) {
    throw new Error(`rift.yaml already exists at ${configPath}`);
  }

  const flags = parseFlags(args);
  const global = getGlobalConfig();

  const agent = flags.agent || global.agent || "codex";

  writeFileSync(configPath, generateConfig(agent));

  console.log(`Initialized rift.yaml in ${mainRepo}`);
  console.log(`  agent:  ${agent}`);
}
