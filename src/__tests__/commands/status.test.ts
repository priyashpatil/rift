import { describe, expect, test, mock, spyOn, beforeEach } from "bun:test";

const mockIsGitRepo = mock(() => Promise.resolve(true));
const mockGetMainWorktree = mock(() => Promise.resolve("/main/repo"));
const mockGetProjectName = mock(() => Promise.resolve("myproject"));
const mockGetCurrentBranch = mock(() => Promise.resolve("main"));
const mockIsRiftWorktree = mock(() => Promise.resolve(false));
const mockGetWorktreeName = mock(() => Promise.resolve("bold-ant"));
const mockGetRepoRoot = mock(() => Promise.resolve("/main/repo"));

mock.module("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
  getCurrentBranch: mockGetCurrentBranch,
  isRiftWorktree: mockIsRiftWorktree,
  getWorktreeName: mockGetWorktreeName,
  getRepoRoot: mockGetRepoRoot,
}));

import { cmdStatus } from "../../commands/status";

describe("cmdStatus", () => {
  beforeEach(() => {
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockGetProjectName.mockClear().mockResolvedValue("myproject");
    mockGetCurrentBranch.mockClear().mockResolvedValue("main");
    mockIsRiftWorktree.mockClear().mockResolvedValue(false);
    mockGetWorktreeName.mockClear().mockResolvedValue("bold-ant");
    mockGetRepoRoot.mockClear().mockResolvedValue("/main/repo");
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdStatus();
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: not in a git repository");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("shows project, main repo, and branch info", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdStatus();

    expect(logSpy).toHaveBeenCalledWith("Project:      myproject");
    expect(logSpy).toHaveBeenCalledWith("Main repo:    /main/repo");
    expect(logSpy).toHaveBeenCalledWith("Branch:       main");
    logSpy.mockRestore();
  });

  test("shows main repository when not in rift worktree", async () => {
    mockIsRiftWorktree.mockResolvedValue(false);
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdStatus();

    expect(logSpy).toHaveBeenCalledWith("Worktree:     (main repository)");
    logSpy.mockRestore();
  });

  test("shows worktree name and path when in rift worktree", async () => {
    mockIsRiftWorktree.mockResolvedValue(true);
    mockGetWorktreeName.mockResolvedValue("bold-ant");
    mockGetRepoRoot.mockResolvedValue("/rift/worktrees/proj/bold-ant");
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdStatus();

    expect(logSpy).toHaveBeenCalledWith(
      "Worktree:     bold-ant (rift-managed)",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Worktree path: /rift/worktrees/proj/bold-ant",
    );
    logSpy.mockRestore();
  });
});
