import { basename } from "path";
import {
  isGitRepo,
  getMainWorktree,
  getProjectName,
  listRiftWorktrees,
  worktreeRemove,
  branchDelete,
  worktreePrune,
} from "../git";
import { syncWorkspace } from "../workspace";
import { runHook } from "../hooks";
import { writeCdPath } from "../ipc";
import { promptYesNo } from "../prompt";
import { getEditor } from "../config";

export async function cmdPurge(args: string[]): Promise<void> {
  const force = args.includes("-f") || args.includes("--force");

  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  const project = await getProjectName();
  const worktrees = await listRiftWorktrees(mainRepo, project);

  if (worktrees.length === 0) {
    console.log("No rift worktrees to purge.");
    return;
  }

  console.log(`Will remove ${worktrees.length} worktree(s) for ${project}:`);
  console.log();
  for (const wt of worktrees) {
    console.log(`  - ${basename(wt.path)} (branch: ${wt.branch})`);
  }
  console.log();

  if (!force) {
    const confirmed = await promptYesNo(
      "Are you sure you want to remove ALL these worktrees? [y/N] ",
    );
    if (!confirmed) {
      console.log("Cancelled.");
      return;
    }
  }

  for (const wt of worktrees) {
    await runHook("purge", wt.path);
    await worktreeRemove(mainRepo, wt.path);
    console.log(`Removed worktree: ${basename(wt.path)}`);
    if (await branchDelete(mainRepo, wt.branch)) {
      console.log(`Deleted branch: ${wt.branch}`);
    } else {
      console.error(`Warning: failed to delete branch ${wt.branch}`);
    }
  }

  await worktreePrune(mainRepo);

  if ((await getEditor()).managedWorkspace) {
    try { await syncWorkspace(project, mainRepo); } catch {}
  }

  console.log(`\nPurged all worktrees for ${project}.`);
  writeCdPath(mainRepo);
}
