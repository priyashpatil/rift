import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { isGitRepo, getMainWorktree, getProjectName } from "../git";
import { WORKSPACES_DIR } from "../constants";
import { syncWorkspace } from "../workspace";
import { getEditor } from "../config";

export async function cmdCode(): Promise<void> {
  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  const mainRepo = await getMainWorktree();
  const project = await getProjectName();
  const editor = await getEditor();

  if (editor.managedWorkspace) {
    const wsPath = join(WORKSPACES_DIR, `${project}.code-workspace`);

    try {
      await syncWorkspace(project, mainRepo);
    } catch {}

    if (!existsSync(wsPath)) {
      console.log("No worktrees found. Use 'rift open' first.");
      return;
    }

    let count = 0;
    try {
      const data = JSON.parse(readFileSync(wsPath, "utf-8"));
      count = data.folders?.length ?? 0;
    } catch {}

    if (count === 0) {
      console.log("No worktrees found. Use 'rift open' first.");
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
