import {
  isGitRepo,
  getMainWorktree,
  getCurrentBranch,
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

  console.log(`Worktrees for ${project}:`);
  console.log();

  const baseMarker = mainRepo === currentPath ? "* " : "  ";
  const baseBranch = await getCurrentBranch(mainRepo);
  console.log(`${baseMarker}base`);
  console.log(`    Branch: ${baseBranch}`);
  console.log(`    Path:   ${mainRepo}`);

  for (const wt of worktrees) {
    const marker = wt.path === currentPath ? "* " : "  ";
    console.log(`${marker}${basename(wt.path)}`);
    console.log(`    Branch: ${wt.branch}`);
    console.log(`    Path:   ${wt.path}`);
  }
}
