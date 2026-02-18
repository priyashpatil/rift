import { homedir } from "os";
import { resolve } from "path";
import { WORKTREES_DIR } from "./constants";
import type { WorktreeInfo } from "./types";

// Use homedir as cwd so spawns don't fail if the process CWD is deleted
const SAFE_CWD = homedir();

async function git(
  dir: string,
  ...args: string[]
): Promise<{ stdout: string; exitCode: number }> {
  const absDir = resolve(dir);
  const proc = Bun.spawn(["git", "-C", absDir, ...args], {
    cwd: SAFE_CWD,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trimEnd(), exitCode };
}

export async function isGitRepo(dir = "."): Promise<boolean> {
  const { exitCode } = await git(dir, "rev-parse", "--git-dir");
  return exitCode === 0;
}

export async function getRepoRoot(dir = "."): Promise<string> {
  const { stdout } = await git(dir, "rev-parse", "--show-toplevel");
  return stdout;
}

export async function getCurrentBranch(dir = "."): Promise<string> {
  const { stdout } = await git(dir, "rev-parse", "--abbrev-ref", "HEAD");
  return stdout;
}

export async function getMainWorktree(dir = "."): Promise<string> {
  const { stdout } = await git(dir, "worktree", "list", "--porcelain");
  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      return line.slice(9);
    }
  }
  throw new Error("Could not determine main worktree");
}

export async function getProjectName(dir = "."): Promise<string> {
  const main = await getMainWorktree(dir);
  return main.split("/").pop()!;
}

export async function isRiftWorktree(dir = "."): Promise<boolean> {
  const root = await getRepoRoot(dir);
  return root.startsWith(WORKTREES_DIR + "/");
}

export async function getWorktreeName(dir = "."): Promise<string> {
  const root = await getRepoRoot(dir);
  const prefix = WORKTREES_DIR + "/";
  if (!root.startsWith(prefix)) return "";
  // Strip WORKTREES_DIR/<project>/ to get the worktree name
  const remainder = root.slice(prefix.length);
  const slashIdx = remainder.indexOf("/");
  return slashIdx === -1 ? remainder : remainder.slice(slashIdx + 1);
}

export async function getDefaultBranch(dir = "."): Promise<string> {
  const { stdout, exitCode } = await git(
    dir,
    "symbolic-ref",
    "refs/remotes/origin/HEAD",
  );
  if (exitCode === 0 && stdout) {
    return stdout.replace("refs/remotes/origin/", "");
  }
  for (const branch of ["main", "master"]) {
    const { exitCode: rc } = await git(
      dir,
      "rev-parse",
      "--verify",
      branch,
    );
    if (rc === 0) return branch;
  }
  throw new Error("Could not determine default branch");
}

export async function listRiftWorktrees(
  mainRepo: string,
  project: string,
): Promise<WorktreeInfo[]> {
  const prefix = `${WORKTREES_DIR}/${project}`;
  const { stdout } = await git(mainRepo, "worktree", "list", "--porcelain");
  const results: WorktreeInfo[] = [];
  let path = "";
  let branch = "";

  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      path = line.slice(9);
    } else if (line.startsWith("branch ")) {
      branch = line.slice(7).replace("refs/heads/", "");
    } else if (line === "") {
      if (path.startsWith(prefix + "/")) {
        results.push({ path, branch });
      }
      path = "";
      branch = "";
    }
  }
  // Handle last entry (no trailing blank line)
  if (path.startsWith(prefix + "/")) {
    results.push({ path, branch });
  }
  return results;
}

export async function worktreeAdd(
  mainRepo: string,
  branch: string,
  wtPath: string,
  base: string,
  quiet = false,
): Promise<void> {
  const args = ["worktree", "add", "-b", branch, wtPath, base];
  const proc = Bun.spawn(["git", "-C", mainRepo, ...args], {
    cwd: SAFE_CWD,
    stdout: quiet ? "pipe" : "inherit",
    stderr: quiet ? "pipe" : "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Failed to create worktree "${branch}"`);
  }
}

export async function worktreeRemove(
  mainRepo: string,
  wtPath: string,
): Promise<void> {
  const proc = Bun.spawn(
    ["git", "-C", mainRepo, "worktree", "remove", wtPath, "--force"],
    { cwd: SAFE_CWD, stdout: "inherit", stderr: "inherit" },
  );
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Failed to remove worktree`);
  }
}

export async function branchDelete(
  mainRepo: string,
  branch: string,
): Promise<boolean> {
  const proc = Bun.spawn(
    ["git", "-C", mainRepo, "branch", "-D", branch],
    { cwd: SAFE_CWD, stdout: "pipe", stderr: "pipe" },
  );
  return (await proc.exited) === 0;
}

export async function worktreePrune(mainRepo: string): Promise<void> {
  const proc = Bun.spawn(
    ["git", "-C", mainRepo, "worktree", "prune"],
    { cwd: SAFE_CWD, stdout: "pipe", stderr: "pipe" },
  );
  await proc.exited;
}
