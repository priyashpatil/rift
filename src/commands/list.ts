import {
  isGitRepo,
  getMainWorktree,
  getProjectName,
  getRepoRoot,
  listRiftWorktrees,
} from "../git";
import { basename } from "path";

export async function cmdList(): Promise<void> {
  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  const project = await getProjectName();
  const currentPath = await getRepoRoot();
  const worktrees = await listRiftWorktrees(mainRepo, project);

  if (worktrees.length === 0) {
    console.log("No rift worktrees found.");
    console.log("Use 'rift open' to create one.");
    return;
  }

  console.log(`Worktrees for ${project}:`);
  console.log();

  for (const wt of worktrees) {
    const marker = wt.path === currentPath ? "* " : "  ";
    console.log(`${marker}${basename(wt.path)}`);
    console.log(`    Branch: ${wt.branch}`);
    console.log(`    Path:   ${wt.path}`);
  }
}
