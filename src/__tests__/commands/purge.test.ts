import { describe, expect, test, mock, spyOn, beforeEach } from "bun:test";

const mockIsGitRepo = mock(() => Promise.resolve(true));
const mockGetMainWorktree = mock(() => Promise.resolve("/main/repo"));
const mockGetProjectName = mock(() => Promise.resolve("myproject"));
const mockListRiftWorktrees = mock(() =>
  Promise.resolve([
    { path: "/worktrees/myproject/bold-ant", branch: "bold-ant" },
    { path: "/worktrees/myproject/calm-bee", branch: "calm-bee" },
  ]),
);
const mockWorktreeRemove = mock(() => Promise.resolve());
const mockBranchDelete = mock(() => Promise.resolve(true));
const mockWorktreePrune = mock(() => Promise.resolve());

mock.module("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
  listRiftWorktrees: mockListRiftWorktrees,
  worktreeRemove: mockWorktreeRemove,
  branchDelete: mockBranchDelete,
  worktreePrune: mockWorktreePrune,
}));

const mockSyncWorkspace = mock(() => Promise.resolve());
mock.module("../../workspace", () => ({
  syncWorkspace: mockSyncWorkspace,
}));

const mockRunHook = mock(() => Promise.resolve());
mock.module("../../hooks", () => ({
  runHook: mockRunHook,
}));

const mockWriteCdPath = mock(() => {});
mock.module("../../ipc", () => ({
  writeCdPath: mockWriteCdPath,
}));

const mockPromptYesNo = mock(() => Promise.resolve(true));
mock.module("../../prompt", () => ({
  promptYesNo: mockPromptYesNo,
}));

const mockGetEditor = mock(() => ({
  name: "VS Code",
  cmd: "code",
  managedWorkspace: true,
}));
mock.module("../../config", () => ({
  getEditor: mockGetEditor,
  getRiftConfig: mock(() => Promise.resolve({})),
  getGlobalConfig: mock(() => ({})),
  saveGlobalConfig: mock(() => {}),
  getAgentCommand: mock(() => "claude"),
  EDITORS: [],
  AGENTS: [],
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
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
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
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge([]);

    expect(logSpy).toHaveBeenCalledWith("No rift worktrees to purge.");
    expect(mockWorktreeRemove).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("prompts for confirmation without force flag", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge([]);

    expect(mockPromptYesNo).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("cancels when user declines", async () => {
    mockPromptYesNo.mockResolvedValue(false);
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge([]);

    expect(logSpy).toHaveBeenCalledWith("Cancelled.");
    expect(mockWorktreeRemove).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("skips confirmation with -f flag", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(mockPromptYesNo).not.toHaveBeenCalled();
    expect(mockWorktreeRemove).toHaveBeenCalledTimes(2);
    logSpy.mockRestore();
  });

  test("skips confirmation with --force flag", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["--force"]);

    expect(mockPromptYesNo).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("removes all worktrees and deletes branches", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

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
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

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
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(mockSyncWorkspace).toHaveBeenCalledWith("myproject", "/main/repo");
    logSpy.mockRestore();
  });

  test("skips workspace sync when editor is not managed", async () => {
    mockGetEditor.mockReturnValue({
      name: "Other",
      cmd: "other",
      managedWorkspace: false,
    });
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdPurge(["-f"]);

    expect(mockSyncWorkspace).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("shows summary of worktrees to remove", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

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
});
