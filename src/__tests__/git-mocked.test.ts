import { describe, expect, test, vi, beforeAll, afterAll } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { execSync } from "child_process";

const { testDir, testWorktreesDir } = vi.hoisted(() => {
  const os = require("os");
  const path = require("path");
  const fs = require("fs");
  const rawDir = path.join(os.tmpdir(), `.rift-test-git-mocked-${process.pid}`);
  fs.mkdirSync(rawDir, { recursive: true });
  const resolved = fs.realpathSync(rawDir);
  fs.rmSync(resolved, { recursive: true, force: true });
  return {
    testDir: resolved,
    testWorktreesDir: path.join(resolved, "worktrees"),
  };
});

// Mock constants so WORKTREES_DIR points to our test dir
vi.mock("../constants", () => ({
  WORKTREES_DIR: testWorktreesDir,
}));

import {
  isRiftWorktree,
  getWorktreeName,
  getDefaultBranch,
  listRiftWorktrees,
  worktreeAdd,
  worktreeRemove,
  branchDelete,
} from "../git";

// Helper to run git commands - only uses hardcoded safe arguments in tests
function run(cwd: string, ...args: string[]): string {
  return execSync(args.join(" "), { cwd, encoding: "utf-8" }).trim();
}

describe("git module (mocked WORKTREES_DIR)", () => {
  const mainRepo = join(testDir, "main-repo");

  beforeAll(() => {
    mkdirSync(mainRepo, { recursive: true });
    run(mainRepo, "git", "init");
    run(mainRepo, "git", "config", "user.email", "test@test.com");
    run(mainRepo, "git", "config", "user.name", "Test");
    run(mainRepo, "git", "checkout", "-b", "main");
    writeFileSync(join(mainRepo, "test.txt"), "hello");
    run(mainRepo, "git", "add", ".");
    run(mainRepo, "git", "commit", "-m", "initial");
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("isRiftWorktree", () => {
    test("returns true for a worktree under WORKTREES_DIR", async () => {
      const projectDir = join(testWorktreesDir, "myproject");
      mkdirSync(projectDir, { recursive: true });
      const wtPath = join(projectDir, "bold-ant");
      await worktreeAdd(mainRepo, "bold-ant", wtPath, "main", true);

      try {
        expect(await isRiftWorktree(wtPath)).toBe(true);
      } finally {
        await worktreeRemove(mainRepo, wtPath);
        await branchDelete(mainRepo, "bold-ant");
      }
    });
  });

  describe("getWorktreeName", () => {
    test("returns worktree name for rift-managed worktree", async () => {
      const projectDir = join(testWorktreesDir, "myproject");
      mkdirSync(projectDir, { recursive: true });
      const wtPath = join(projectDir, "calm-bee");
      await worktreeAdd(mainRepo, "calm-bee", wtPath, "main", true);

      try {
        const name = await getWorktreeName(wtPath);
        expect(name).toBe("calm-bee");
      } finally {
        await worktreeRemove(mainRepo, wtPath);
        await branchDelete(mainRepo, "calm-bee");
      }
    });
  });

  describe("getDefaultBranch", () => {
    test("throws when no default branch can be determined", async () => {
      const weirdRepo = join(testDir, "weird-repo");
      mkdirSync(weirdRepo, { recursive: true });
      run(weirdRepo, "git", "init");
      run(weirdRepo, "git", "config", "user.email", "test@test.com");
      run(weirdRepo, "git", "config", "user.name", "Test");
      run(weirdRepo, "git", "checkout", "-b", "develop");
      writeFileSync(join(weirdRepo, "test.txt"), "hello");
      run(weirdRepo, "git", "add", ".");
      run(weirdRepo, "git", "commit", "-m", "initial");

      try {
        await expect(getDefaultBranch(weirdRepo)).rejects.toThrow(
          "Could not determine default branch",
        );
      } finally {
        rmSync(weirdRepo, { recursive: true, force: true });
      }
    });
  });

  describe("worktreeRemove", () => {
    test("throws when git worktree remove fails", async () => {
      await expect(
        worktreeRemove(mainRepo, "/nonexistent/path/that/does/not/exist"),
      ).rejects.toThrow("Failed to remove worktree");
    });
  });

  describe("listRiftWorktrees", () => {
    test("returns matching worktrees under WORKTREES_DIR", async () => {
      const projectDir = join(testWorktreesDir, "list-project");
      mkdirSync(projectDir, { recursive: true });
      const wt1Path = join(projectDir, "wt-alpha");
      const wt2Path = join(projectDir, "wt-beta");

      await worktreeAdd(mainRepo, "wt-alpha", wt1Path, "main", true);
      await worktreeAdd(mainRepo, "wt-beta", wt2Path, "main", true);

      try {
        const worktrees = await listRiftWorktrees(mainRepo, "list-project");
        expect(worktrees.length).toBe(2);
        expect(worktrees.some((w) => w.branch === "wt-alpha")).toBe(true);
        expect(worktrees.some((w) => w.branch === "wt-beta")).toBe(true);
      } finally {
        await worktreeRemove(mainRepo, wt1Path);
        await worktreeRemove(mainRepo, wt2Path);
        await branchDelete(mainRepo, "wt-alpha");
        await branchDelete(mainRepo, "wt-beta");
      }
    });
  });
});
