import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  statSync,
} from "fs";
import { join, basename } from "path";
import { WORKSPACES_DIR, WORKTREES_DIR } from "./constants";
import { getDefaultBranch } from "./git";

interface WorkspaceFolder {
  name: string;
  path: string;
}

interface WorkspaceFile {
  folders: WorkspaceFolder[];
  [key: string]: unknown;
}

export async function syncWorkspace(
  project: string,
  mainRepo: string,
  extraFolders?: string[],
): Promise<void> {
  const wsPath = join(WORKSPACES_DIR, `${project}.code-workspace`);
  const wtDir = join(WORKTREES_DIR, project);
  let defaultBranch: string;
  try {
    defaultBranch = await getDefaultBranch(mainRepo);
  } catch {
    defaultBranch = "main";
  }

  mkdirSync(WORKSPACES_DIR, { recursive: true });

  const folders: WorkspaceFolder[] = [{ name: defaultBranch, path: mainRepo }];

  if (existsSync(wtDir)) {
    const entries = readdirSync(wtDir)
      .filter((e) => statSync(join(wtDir, e)).isDirectory())
      .sort();
    for (const entry of entries) {
      folders.push({ name: entry, path: join(wtDir, entry) });
    }
  }

  if (extraFolders) {
    for (const folder of extraFolders) {
      folders.push({ name: basename(folder), path: folder });
    }
  }

  let base: WorkspaceFile = { folders };
  if (existsSync(wsPath)) {
    try {
      base = JSON.parse(readFileSync(wsPath, "utf-8")) as WorkspaceFile;
    } catch {}
  }
  base.folders = folders;
  writeFileSync(wsPath, JSON.stringify(base, null, 2) + "\n");
}
