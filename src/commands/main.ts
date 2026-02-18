import { isGitRepo, getMainWorktree } from "../git";
import { writeCdPath } from "../ipc";

export async function cmdMain(): Promise<void> {
  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  if (!process.env.RIFT_SHELL_PID) {
    console.log(`Main repo: ${mainRepo}`);
    console.log(
      `\nHint: Add this to your shell profile to enable auto-cd:\n  eval "$(rift _shell-init)"`,
    );
    return;
  }
  writeCdPath(mainRepo);
  console.log(`Switching to: ${mainRepo}`);
}
