import {
  isGitRepo,
  getMainWorktree,
  getProjectName,
  getCurrentBranch,
  isRiftWorktree,
  getWorktreeName,
  getRepoRoot,
} from "../git";

export async function cmdStatus(): Promise<void> {
  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  const project = await getProjectName();
  const branch = await getCurrentBranch();

  console.log(`Project:      ${project}`);
  console.log(`Main repo:    ${mainRepo}`);
  console.log(`Branch:       ${branch}`);

  if (await isRiftWorktree()) {
    const wtName = await getWorktreeName();
    const wtPath = await getRepoRoot();
    console.log(`Worktree:     ${wtName} (rift-managed)`);
    console.log(`Worktree path: ${wtPath}`);
  } else {
    console.log("Worktree:     (main repository)");
  }
}
