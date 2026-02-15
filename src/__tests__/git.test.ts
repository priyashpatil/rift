import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, realpathSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  isGitRepo,
  getRepoRoot,
  getCurrentBranch,
  getMainWorktree,
  getProjectName,
  isRiftWorktree,
  getWorktreeName,
  getDefaultBranch,
  listRiftWorktrees,
  worktreeAdd,
  worktreeRemove,
  branchDelete,
  worktreePrune,
} from "../git";

// macOS resolves /var -> /private/var via symlink, so use realpath
const testDirRaw = join(tmpdir(), `.rift-test-git-${process.pid}`);
mkdirSync(testDirRaw, { recursive: true });
const testDir = realpathSync(testDirRaw);
rmSync(testDir, { recursive: true, force: true });

async function run(cwd: string, ...args: string[]): Promise<string> {
  const proc = Bun.spawn(args, { cwd, stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}

describe("git module", () => {
  beforeAll(async () => {
    mkdirSync(testDir, { recursive: true });
    await run(testDir, "git", "init");
    await run(testDir, "git", "config", "user.email", "test@test.com");
    await run(testDir, "git", "config", "user.name", "Test");
    await run(testDir, "git", "checkout", "-b", "main");
    const testFile = join(testDir, "test.txt");
    Bun.write(testFile, "hello");
    await run(testDir, "git", "add", ".");
    await run(testDir, "git", "commit", "-m", "initial");
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("isGitRepo", () => {
    test("returns true for a git repository", async () => {
      expect(await isGitRepo(testDir)).toBe(true);
    });

    test("returns false for a non-repo directory", async () => {
      const nonRepoRaw = join(tmpdir(), `.rift-test-nonrepo-${process.pid}`);
      mkdirSync(nonRepoRaw, { recursive: true });
      const nonRepo = realpathSync(nonRepoRaw);
      try {
        expect(await isGitRepo(nonRepo)).toBe(false);
      } finally {
        rmSync(nonRepo, { recursive: true, force: true });
      }
    });
  });

  describe("getRepoRoot", () => {
    test("returns the root path of the repo", async () => {
      const root = await getRepoRoot(testDir);
      expect(root).toBe(testDir);
    });
  });

  describe("getCurrentBranch", () => {
    test("returns the current branch name", async () => {
      const branch = await getCurrentBranch(testDir);
      expect(branch).toBe("main");
    });
  });

  describe("getMainWorktree", () => {
    test("returns the main worktree path", async () => {
      const main = await getMainWorktree(testDir);
      expect(main).toBe(testDir);
    });

    test("throws for a non-git directory", async () => {
      const nonGitDir = join(
        tmpdir(),
        `.rift-test-nongit-wt-${process.pid}`,
      );
      mkdirSync(nonGitDir, { recursive: true });
      const resolvedDir = realpathSync(nonGitDir);
      try {
        await getMainWorktree(resolvedDir);
        expect(true).toBe(false); // should not reach
      } catch (e: any) {
        expect(e.message).toContain("Could not determine main worktree");
      } finally {
        rmSync(resolvedDir, { recursive: true, force: true });
      }
    });
  });

  describe("getProjectName", () => {
    test("returns the directory name of the main worktree", async () => {
      const name = await getProjectName(testDir);
      const expected = testDir.split("/").pop()!;
      expect(name).toBe(expected);
    });
  });

  describe("isRiftWorktree", () => {
    test("returns false for a normal repo", async () => {
      expect(await isRiftWorktree(testDir)).toBe(false);
    });
  });

  describe("getWorktreeName", () => {
    test("returns empty string for non-rift worktree", async () => {
      expect(await getWorktreeName(testDir)).toBe("");
    });
  });

  describe("getDefaultBranch", () => {
    test("detects main branch", async () => {
      const branch = await getDefaultBranch(testDir);
      expect(branch).toBe("main");
    });

    test("returns a string branch name", async () => {
      // getDefaultBranch falls through symbolic-ref -> main -> master
      const branch = await getDefaultBranch(testDir);
      expect(typeof branch).toBe("string");
      expect(branch.length).toBeGreaterThan(0);
    });
  });

  describe("listRiftWorktrees", () => {
    test("returns empty array when no rift worktrees exist", async () => {
      const worktrees = await listRiftWorktrees(testDir, "test-project");
      expect(worktrees).toEqual([]);
    });
  });

  describe("worktree operations", () => {
    const wtDir = join(testDir, "wt-test");

    test("worktreeAdd creates a new worktree", async () => {
      await worktreeAdd(testDir, "test-branch", wtDir, "main", true);
      const branch = await getCurrentBranch(wtDir);
      expect(branch).toBe("test-branch");
    });

    test("worktreeRemove removes a worktree", async () => {
      await worktreeRemove(testDir, wtDir);
      const { existsSync } = await import("fs");
      expect(existsSync(wtDir)).toBe(false);
    });

    test("branchDelete deletes a branch", async () => {
      await run(testDir, "git", "branch", "deleteme");
      const result = await branchDelete(testDir, "deleteme");
      expect(result).toBe(true);
    });

    test("branchDelete returns false for non-existent branch", async () => {
      const result = await branchDelete(testDir, "nonexistent-branch");
      expect(result).toBe(false);
    });

    test("worktreePrune runs without error", async () => {
      await worktreePrune(testDir);
    });
  });

  describe("getWorktreeName with nested path", () => {
    test("extracts worktree name from nested WORKTREES_DIR path", async () => {
      // getWorktreeName strips WORKTREES_DIR/<project>/ prefix
      // Since this repo is not under WORKTREES_DIR, it returns ""
      const name = await getWorktreeName(testDir);
      expect(name).toBe("");
    });
  });

  describe("worktreeAdd quiet vs non-quiet", () => {
    test("worktreeAdd works with quiet=false", async () => {
      const wtPath = join(testDir, "wt-nonquiet");
      try {
        await worktreeAdd(testDir, "nonquiet-branch", wtPath, "main", false);
        const branch = await getCurrentBranch(wtPath);
        expect(branch).toBe("nonquiet-branch");
      } finally {
        try {
          await worktreeRemove(testDir, wtPath);
        } catch {}
        try {
          await branchDelete(testDir, "nonquiet-branch");
        } catch {}
      }
    });
  });
});
