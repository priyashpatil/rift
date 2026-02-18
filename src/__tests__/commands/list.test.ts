import { describe, expect, test, mock, spyOn, beforeEach } from "bun:test";

const mockIsGitRepo = mock(() => Promise.resolve(true));
const mockGetMainWorktree = mock(() => Promise.resolve("/main/repo"));
const mockGetCurrentBranch = mock(() => Promise.resolve("main"));
const mockGetProjectName = mock(() => Promise.resolve("myproject"));
const mockGetRepoRoot = mock(() => Promise.resolve("/main/repo"));
const mockListRiftWorktrees = mock(() => Promise.resolve([]));

mock.module("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getCurrentBranch: mockGetCurrentBranch,
  getProjectName: mockGetProjectName,
  getRepoRoot: mockGetRepoRoot,
  listRiftWorktrees: mockListRiftWorktrees,
}));

import { cmdList } from "../../commands/list";

describe("cmdList", () => {
  beforeEach(() => {
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockGetCurrentBranch.mockClear().mockResolvedValue("main");
    mockGetProjectName.mockClear().mockResolvedValue("myproject");
    mockGetRepoRoot.mockClear().mockResolvedValue("/main/repo");
    mockListRiftWorktrees.mockClear().mockResolvedValue([]);
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdList();
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: not in a git repository");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("shows base workspace when no rift worktrees exist", async () => {
    mockListRiftWorktrees.mockResolvedValue([]);
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdList();

    expect(logSpy).toHaveBeenCalledWith("Worktrees for myproject:");
    expect(logSpy).toHaveBeenCalledWith("* base");
    expect(logSpy).toHaveBeenCalledWith("    Branch: main");
    expect(logSpy).toHaveBeenCalledWith("    Path:   /main/repo");
    logSpy.mockRestore();
  });

  test("lists worktrees with base and branch info", async () => {
    mockListRiftWorktrees.mockResolvedValue([
      { path: "/worktrees/myproject/bold-ant", branch: "bold-ant" },
      { path: "/worktrees/myproject/calm-bee", branch: "calm-bee" },
    ]);
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdList();

    expect(logSpy).toHaveBeenCalledWith("Worktrees for myproject:");
    expect(logSpy).toHaveBeenCalledWith("* base");
    expect(logSpy).toHaveBeenCalledWith("    Branch: bold-ant");
    expect(logSpy).toHaveBeenCalledWith(
      "    Path:   /worktrees/myproject/bold-ant",
    );
    logSpy.mockRestore();
  });

  test("marks current worktree with asterisk", async () => {
    mockGetRepoRoot.mockResolvedValue("/worktrees/myproject/bold-ant");
    mockListRiftWorktrees.mockResolvedValue([
      { path: "/worktrees/myproject/bold-ant", branch: "bold-ant" },
      { path: "/worktrees/myproject/calm-bee", branch: "calm-bee" },
    ]);
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdList();

    expect(logSpy).toHaveBeenCalledWith("  base");
    expect(logSpy).toHaveBeenCalledWith("* bold-ant");
    expect(logSpy).toHaveBeenCalledWith("  calm-bee");
    logSpy.mockRestore();
  });
});
