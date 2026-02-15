import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import {
  isGitRepo,
  getMainWorktree,
  getProjectName,
  getCurrentBranch,
  worktreeAdd,
} from "../git";
import { RIFT_DIR, WORKTREES_DIR } from "../constants";
import { generateName } from "../names";
import { syncWorkspace } from "../workspace";
import { runHook } from "../hooks";
import { writeCdPath, signalAgentStart } from "../ipc";
import { getEditor } from "../config";

export async function cmdOpen(args: string[]): Promise<void> {
  let name = "";
  let base = "";
  let skipAgent = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--base" && i + 1 < args.length) {
      base = args[++i];
    } else if (arg.startsWith("--base=")) {
      base = arg.slice(7);
    } else if (arg === "--skip-agent") {
      skipAgent = true;
    } else if (arg.startsWith("-")) {
      console.error(`Error: unknown option: ${arg}`);
      process.exit(1);
    } else if (!name) {
      name = arg;
    } else {
      console.error(`Error: unexpected argument: ${arg}`);
      process.exit(1);
    }
  }

  if (!(await isGitRepo())) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  mkdirSync(RIFT_DIR, { recursive: true });
  mkdirSync(WORKTREES_DIR, { recursive: true });

  const mainRepo = await getMainWorktree();
  const project = await getProjectName();
  if (!name) name = generateName();
  if (!base) base = await getCurrentBranch();

  const wtPath = `${WORKTREES_DIR}/${project}/${name}`;

  if (existsSync(wtPath)) {
    console.error(`Error: worktree "${name}" already exists`);
    process.exit(1);
  }

  mkdirSync(dirname(wtPath), { recursive: true });
  await worktreeAdd(mainRepo, name, wtPath, base);

  console.log(`Created worktree: ${name}`);
  console.log(`Branch: ${name} (based on ${base})`);
  console.log(`Path: ${wtPath}`);

  if ((await getEditor()).managedWorkspace) {
    try { await syncWorkspace(project, mainRepo); } catch {}
  }

  await runHook("open", wtPath);
  writeCdPath(wtPath);
  if (!skipAgent) signalAgentStart();
}
