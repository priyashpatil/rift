import { basename } from "path";
import {
  isGitRepo,
  getMainWorktree,
  getProjectName,
  listRiftWorktrees,
} from "../git";
import { writeCdPath, signalAgentStart } from "../ipc";
import { runHook } from "../hooks";
import { warnIfAgentMissing } from "../config";

export async function cmdJump(args: string[]): Promise<void> {
  const skipAgent = args.includes("--skip-agent");
  const skipHooks = args.includes("--skip-hooks");
  const positional = args.filter(
    (a) => a !== "--skip-agent" && a !== "--skip-hooks",
  );
  const name = positional[0];

  if (!name) {
    console.error("Usage: rift jump <name> [--skip-agent] [--skip-hooks]");
    process.exit(1);
  }

  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  const project = await getProjectName();
  const worktrees = await listRiftWorktrees(mainRepo, project);

  const match = worktrees.find((wt) => basename(wt.path) === name);

  if (!match) {
    console.error(`Error: worktree "${name}" not found`);
    if (worktrees.length > 0) {
      console.error("Available worktrees:");
      for (const wt of worktrees) {
        console.error(`  ${basename(wt.path)}`);
      }
    }
    process.exit(1);
  }

  if (!process.env.RIFT_SHELL_PID) {
    console.log(`Worktree: ${name}`);
    console.log(`Path: ${match.path}`);
    console.log(
      `\nHint: Add this to your shell profile to enable auto-cd:\n  eval "$(rift _shell-init)"`,
    );
    return;
  }

  console.log(`Jumping to: ${name}`);
  writeCdPath(match.path);
  if (!skipAgent) {
    await warnIfAgentMissing();
    signalAgentStart();
  }
  if (!skipHooks) await runHook("jump", match.path);
}
