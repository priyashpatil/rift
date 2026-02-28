import { describe, expect, test, vi, beforeEach } from "vitest";

const {
  mockIsGitRepo,
  mockGetMainWorktree,
  mockGetProjectName,
  mockListRiftWorktrees,
  mockWorktreeRemove,
  mockBranchDelete,
  mockWorktreePrune,
  mockSyncWorkspace,
  mockRunHook,
  mockWriteCdPath,
  mockPromptYesNo,
  mockGetEditor,
  mockRemoveProjectAgents,
} = vi.hoisted(() => ({
  mockIsGitRepo: vi.fn(() => Promise.resolve(true)),
  mockGetMainWorktree: vi.fn(() => Promise.resolve("/main/repo")),
  mockGetProjectName: vi.fn(() => Promise.resolve("myproject")),
  mockListRiftWorktrees: vi.fn(() =>
    Promise.resolve([
      { path: "/worktrees/myproject/bold-ant", branch: "bold-ant" },
      { path: "/worktrees/myproject/calm-bee", branch: "calm-bee" },
    ]),
  ),
  mockWorktreeRemove: vi.fn(() => Promise.resolve()),
  mockBranchDelete: vi.fn(() => Promise.resolve(true)),
  mockWorktreePrune: vi.fn(() => Promise.resolve()),
  mockSyncWorkspace: vi.fn(() => Promise.resolve()),
  mockRunHook: vi.fn(() => Promise.resolve()),
  mockWriteCdPath: vi.fn(() => {}),
  mockPromptYesNo: vi.fn(() => Promise.resolve(true)),
  mockGetEditor: vi.fn(() => ({
    name: "VS Code",
    cmd: "code",
    managedWorkspace: true,
  })),
  mockRemoveProjectAgents: vi.fn(() => []),
}));

vi.mock("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
  listRiftWorktrees: mockListRiftWorktrees,
  worktreeRemove: mockWorktreeRemove,
  branchDelete: mockBranchDelete,
  worktreePrune: mockWorktreePrune,
}));

vi.mock("../../workspace", () => ({
  syncWorkspace: mockSyncWorkspace,
}));

vi.mock("../../hooks", () => ({
  runHook: mockRunHook,
}));

vi.mock("../../ipc", () => ({
  writeCdPath: mockWriteCdPath,
}));

vi.mock("../../prompt", () => ({
  promptYesNo: mockPromptYesNo,
}));

vi.mock("../../config", () => ({
  getEditor: mockGetEditor,
  getRiftConfig: vi.fn(() => Promise.resolve({})),
  getGlobalConfig: vi.fn(() => ({})),
  saveGlobalConfig: vi.fn(() => {}),
  getAgentCommand: vi.fn(() => "claude"),
  EDITORS: [],
}));

vi.mock("../../agents", () => ({
  removeProjectAgents: mockRemoveProjectAgents,
}));

import { cmdPurge } from "../../commands/purge";

describe("cmdPurge", () => {
  beforeEach(() => {
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockGetProjectName.mockClear().mockResolvedValue("myproject");
    mockListRiftWorktrees.mockClear().mockResolvedValue([
      { path: "/worktrees/myproject/bold-ant", branch: "bold-ant" },
      { path: "/worktrees/myproject/calm-bee", branch: "calm-bee" },
    ]);
    mockWorktreeRemove.mockClear().mockResolvedValue(undefined);
    mockBranchDelete.mockClear().mockResolvedValue(true);
    mockWorktreePrune.mockClear().mockResolvedValue(undefined);
    mockSyncWorkspace.mockClear().mockResolvedValue(undefined);
    mockRunHook.mockClear().mockResolvedValue(undefined);
    mockWriteCdPath.mockClear();
    mockPromptYesNo.mockClear().mockResolvedValue(true);
    mockGetEditor.mockClear().mockReturnValue({
      name: "VS Code",
      cmd: "code",
      managedWorkspace: true,
    });
    mockRemoveProjectAgents.mockClear().mockReturnValue([]);
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdPurge([]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: not in a git repository");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("reports no worktrees when list is empty", async () => {
    mockListRiftWorktrees.mockResolvedValue([]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge([]);

    expect(logSpy).toHaveBeenCalledWith("No rift worktrees to purge.");
    expect(mockWorktreeRemove).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("prompts for confirmation without force flag", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge([]);

    expect(mockPromptYesNo).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("cancels when user declines", async () => {
    mockPromptYesNo.mockResolvedValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge([]);

    expect(logSpy).toHaveBeenCalledWith("Cancelled.");
    expect(mockWorktreeRemove).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("skips confirmation with -f flag", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(mockPromptYesNo).not.toHaveBeenCalled();
    expect(mockWorktreeRemove).toHaveBeenCalledTimes(2);
    logSpy.mockRestore();
  });

  test("skips confirmation with --force flag", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["--force"]);

    expect(mockPromptYesNo).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("removes all worktrees and deletes branches", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(mockRunHook).toHaveBeenCalledTimes(2);
    expect(mockRunHook).toHaveBeenCalledWith(
      "purge",
      "/worktrees/myproject/bold-ant",
    );
    expect(mockRunHook).toHaveBeenCalledWith(
      "purge",
      "/worktrees/myproject/calm-bee",
    );
    expect(mockWorktreeRemove).toHaveBeenCalledTimes(2);
    expect(mockBranchDelete).toHaveBeenCalledTimes(2);
    expect(mockWorktreePrune).toHaveBeenCalledWith("/main/repo");
    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    logSpy.mockRestore();
  });

  test("warns when branch deletion fails", async () => {
    mockBranchDelete.mockResolvedValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(errorSpy).toHaveBeenCalledWith(
      "Warning: failed to delete branch bold-ant",
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "Warning: failed to delete branch calm-bee",
    );
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("syncs workspace after purge", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(mockSyncWorkspace).toHaveBeenCalledWith("myproject", "/main/repo", undefined);
    logSpy.mockRestore();
  });

  test("skips workspace sync when editor is not managed", async () => {
    mockGetEditor.mockReturnValue({
      name: "Other",
      cmd: "other",
      managedWorkspace: false,
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(mockSyncWorkspace).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("shows summary of worktrees to remove", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(logSpy).toHaveBeenCalledWith(
      "Will remove 2 worktree(s) for myproject:",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "  - bold-ant (branch: bold-ant)",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "  - calm-bee (branch: calm-bee)",
    );
    logSpy.mockRestore();
  });

  test("removes project agent registrations before purging", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(mockRemoveProjectAgents).toHaveBeenCalledWith("myproject");
    logSpy.mockRestore();
  });

  test("logs agent shutdown message when agents are running", async () => {
    mockRemoveProjectAgents.mockReturnValue([
      { shellPid: 111, agentPid: 222, mainWorktreePath: "/main/repo" },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(logSpy).toHaveBeenCalledWith(
      "Signaling 1 running agent(s) to shut down...",
    );
    logSpy.mockRestore();
  });
});
