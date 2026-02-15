import { isGitRepo, getMainWorktree } from "../git";
import { writeCdPath } from "../ipc";

export async function cmdMain(): Promise<void> {
  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  writeCdPath(mainRepo);
  console.log(`Switching to: ${mainRepo}`);
}
