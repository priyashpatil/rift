import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdirSync, rmSync, realpathSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";
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

// Helper to run git commands in tests with hardcoded safe arguments
function run(cwd: string, ...args: string[]): string {
  return execSync(args.join(" "), { cwd, encoding: "utf-8" }).trim();
}

describe("git module", () => {
  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
    run(testDir, "git", "init");
    run(testDir, "git", "config", "user.email", "test@test.com");
    run(testDir, "git", "config", "user.name", "Test");
    run(testDir, "git", "checkout", "-b", "main");
    const testFile = join(testDir, "test.txt");
    writeFileSync(testFile, "hello");
    run(testDir, "git", "add", ".");
    run(testDir, "git", "commit", "-m", "initial");
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
      const nonGitDir = join(tmpdir(), `.rift-test-nongit-wt-${process.pid}`);
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
      run(testDir, "git", "branch", "deleteme");
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

  describe("getDefaultBranch with symbolic-ref", () => {
    test("uses symbolic-ref when remote origin/HEAD is set", async () => {
      run(testDir, "git", "remote", "add", "origin", testDir);
      run(
        testDir,
        "git",
        "symbolic-ref",
        "refs/remotes/origin/HEAD",
        "refs/remotes/origin/main",
      );

      const branch = await getDefaultBranch(testDir);
      expect(branch).toBe("main");

      run(testDir, "git", "remote", "remove", "origin");
    });
  });

  describe("worktreeAdd error case", () => {
    test("throws when worktree creation fails", async () => {
      await expect(
        worktreeAdd(testDir, "main", join(testDir, "wt-fail"), "main", true),
      ).rejects.toThrow("Failed to create worktree");
    });
  });
});
