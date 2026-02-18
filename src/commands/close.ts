import {
  isGitRepo,
  isRiftWorktree,
  getMainWorktree,
  getProjectName,
  getWorktreeName,
  getRepoRoot,
  getCurrentBranch,
  worktreeRemove,
  branchDelete,
} from "../git";
import { syncWorkspace } from "../workspace";
import { runHook } from "../hooks";
import { writeCdPath } from "../ipc";
import { promptYesNo } from "../prompt";
import { getEditor } from "../config";
import { removeWorktreeAgents } from "../agents";

export async function cmdClose(args: string[]): Promise<void> {
  const force = args.includes("-f") || args.includes("--force");

  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  if (!(await isRiftWorktree())) {
    console.error("Error: not in a rift-managed worktree");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  const project = await getProjectName();
  const wtName = await getWorktreeName();
  const wtPath = await getRepoRoot();
  const branch = await getCurrentBranch();

  if (!force) {
    const confirmed = await promptYesNo(
      `Close worktree "${wtName}" and delete branch? [y/N] `,
    );
    if (!confirmed) {
      console.log("Cancelled.");
      return;
    }
  }

  const removedAgents = removeWorktreeAgents(project, wtName);
  if (removedAgents.length > 0) {
    console.log(
      `Signaling ${removedAgents.length} running agent(s) to shut down...`,
    );
    await Bun.sleep(2000);
  }

  await runHook("close", wtPath);
  await worktreeRemove(mainRepo, wtPath);
  console.log(`Removed worktree: ${wtName}`);

  if (await branchDelete(mainRepo, branch)) {
    console.log(`Deleted branch: ${branch}`);
  } else {
    console.error(`Warning: failed to delete branch ${branch}`);
  }

  if ((await getEditor()).managedWorkspace) {
    try { await syncWorkspace(project, mainRepo); } catch {}
  }

  writeCdPath(mainRepo);
}
