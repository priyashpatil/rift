import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  isGitRepo,
  getMainWorktree,
  getProjectName,
  listRiftWorktrees,
} from "../git";
import { WORKSPACES_DIR } from "../constants";
import { syncWorkspace } from "../workspace";
import { getEditor, getRiftConfig } from "../config";

export async function cmdCode(): Promise<void> {
  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  const project = await getProjectName();
  const editor = await getEditor();

  if (editor.managedWorkspace) {
    const worktrees = await listRiftWorktrees(mainRepo, project);
    if (worktrees.length === 0) {
      console.log("No worktrees found. Use 'rift open' first.");
      return;
    }

    const wsPath = join(WORKSPACES_DIR, `${project}.code-workspace`);

    try {
      const config = await getRiftConfig(mainRepo);
      await syncWorkspace(project, mainRepo, config["extra-workspaces"]);
    } catch {}

    if (!existsSync(wsPath)) {
      console.error("Error: failed to create workspace file");
      return;
    }

    let count = 0;
    try {
      const data = JSON.parse(readFileSync(wsPath, "utf-8"));
      count = data.folders?.length ?? 0;
    } catch {}

    if (count === 0) {
      console.error("Error: workspace file is empty or corrupt");
      return;
    }

    const proc = Bun.spawn([editor.cmd, wsPath], {
      cwd: homedir(),
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;

    console.log(`Opened workspace: ${wsPath}`);
    console.log(`Folders: ${count} worktree(s)`);
  } else {
    const proc = Bun.spawn([editor.cmd, mainRepo], {
      cwd: homedir(),
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;

    console.log(`Opened ${mainRepo} in ${editor.name}`);
  }
}
