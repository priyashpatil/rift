import { describe, expect, test, vi, beforeEach } from "vitest";

const {
  mockIsGitRepo,
  mockIsRiftWorktree,
  mockGetMainWorktree,
  mockGetProjectName,
  mockGetWorktreeName,
  mockGetRepoRoot,
  mockGetCurrentBranch,
  mockWorktreeRemove,
  mockBranchDelete,
  mockSyncWorkspace,
  mockRunHook,
  mockWriteCdPath,
  mockPromptYesNo,
  mockGetEditor,
  mockRemoveWorktreeAgents,
} = vi.hoisted(() => ({
  mockIsGitRepo: vi.fn(() => Promise.resolve(true)),
  mockIsRiftWorktree: vi.fn(() => Promise.resolve(true)),
  mockGetMainWorktree: vi.fn(() => Promise.resolve("/main/repo")),
  mockGetProjectName: vi.fn(() => Promise.resolve("myproject")),
  mockGetWorktreeName: vi.fn(() => Promise.resolve("bold-ant")),
  mockGetRepoRoot: vi.fn(() => Promise.resolve("/worktrees/myproject/bold-ant")),
  mockGetCurrentBranch: vi.fn(() => Promise.resolve("bold-ant")),
  mockWorktreeRemove: vi.fn(() => Promise.resolve()),
  mockBranchDelete: vi.fn(() => Promise.resolve(true)),
  mockSyncWorkspace: vi.fn(() => Promise.resolve()),
  mockRunHook: vi.fn(() => Promise.resolve()),
  mockWriteCdPath: vi.fn(() => {}),
  mockPromptYesNo: vi.fn(() => Promise.resolve(true)),
  mockGetEditor: vi.fn(() => ({
    name: "VS Code",
    cmd: "code",
    managedWorkspace: true,
  })),
  mockRemoveWorktreeAgents: vi.fn(() => []),
}));

vi.mock("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  isRiftWorktree: mockIsRiftWorktree,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
  getWorktreeName: mockGetWorktreeName,
  getRepoRoot: mockGetRepoRoot,
  getCurrentBranch: mockGetCurrentBranch,
  worktreeRemove: mockWorktreeRemove,
  branchDelete: mockBranchDelete,
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
  removeWorktreeAgents: mockRemoveWorktreeAgents,
}));

import { cmdClose } from "../../commands/close";

describe("cmdClose", () => {
  beforeEach(() => {
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockIsRiftWorktree.mockClear().mockResolvedValue(true);
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockGetProjectName.mockClear().mockResolvedValue("myproject");
    mockGetWorktreeName.mockClear().mockResolvedValue("bold-ant");
    mockGetRepoRoot
      .mockClear()
      .mockResolvedValue("/worktrees/myproject/bold-ant");
    mockGetCurrentBranch.mockClear().mockResolvedValue("bold-ant");
    mockWorktreeRemove.mockClear().mockResolvedValue(undefined);
    mockBranchDelete.mockClear().mockResolvedValue(true);
    mockSyncWorkspace.mockClear().mockResolvedValue(undefined);
    mockRunHook.mockClear().mockResolvedValue(undefined);
    mockWriteCdPath.mockClear();
    mockPromptYesNo.mockClear().mockResolvedValue(true);
    mockGetEditor.mockClear().mockReturnValue({
      name: "VS Code",
      cmd: "code",
      managedWorkspace: true,
    });
    mockRemoveWorktreeAgents.mockClear().mockReturnValue([]);
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdClose([]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: not in a git repository");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("exits with error when not in a rift worktree", async () => {
    mockIsRiftWorktree.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdClose([]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith(
      "Error: not in a rift-managed worktree",
    );
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("prompts for confirmation without force flag", async () => {
    mockPromptYesNo.mockResolvedValue(true);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose([]);

    expect(mockPromptYesNo).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("cancels when user declines confirmation", async () => {
    mockPromptYesNo.mockResolvedValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose([]);

    expect(logSpy).toHaveBeenCalledWith("Cancelled.");
    expect(mockWorktreeRemove).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("skips confirmation with -f flag", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose(["-f"]);

    expect(mockPromptYesNo).not.toHaveBeenCalled();
    expect(mockWorktreeRemove).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("skips confirmation with --force flag", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose(["--force"]);

    expect(mockPromptYesNo).not.toHaveBeenCalled();
    expect(mockWorktreeRemove).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("removes worktree, deletes branch, syncs workspace", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose(["-f"]);

    expect(mockRunHook).toHaveBeenCalledWith(
      "close",
      "/worktrees/myproject/bold-ant",
    );
    expect(mockWorktreeRemove).toHaveBeenCalledWith(
      "/main/repo",
      "/worktrees/myproject/bold-ant",
    );
    expect(mockBranchDelete).toHaveBeenCalledWith("/main/repo", "bold-ant");
    expect(mockSyncWorkspace).toHaveBeenCalledWith("myproject", "/main/repo", undefined);
    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    logSpy.mockRestore();
  });

  test("warns when branch deletion fails", async () => {
    mockBranchDelete.mockResolvedValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await cmdClose(["-f"]);

    expect(errorSpy).toHaveBeenCalledWith(
      "Warning: failed to delete branch bold-ant",
    );
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("skips workspace sync when editor is not managed", async () => {
    mockGetEditor.mockReturnValue({
      name: "Other",
      cmd: "other",
      managedWorkspace: false,
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose(["-f"]);

    expect(mockSyncWorkspace).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("removes worktree agent registrations before closing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose(["-f"]);

    expect(mockRemoveWorktreeAgents).toHaveBeenCalledWith(
      "myproject",
      "bold-ant",
    );
    logSpy.mockRestore();
  });

  test("--skip-hooks prevents running close hook", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose(["-f", "--skip-hooks"]);

    expect(mockRunHook).not.toHaveBeenCalled();
    expect(mockWorktreeRemove).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("logs agent shutdown message when agents are running", async () => {
    mockRemoveWorktreeAgents.mockReturnValue([
      { shellPid: 111, agentPid: 222, mainWorktreePath: "/main/repo" },
      { shellPid: 333, agentPid: 444, mainWorktreePath: "/main/repo" },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdClose(["-f"]);

    expect(logSpy).toHaveBeenCalledWith(
      "Signaling 2 running agent(s) to shut down...",
    );
    logSpy.mockRestore();
  });
});
