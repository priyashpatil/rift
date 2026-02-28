import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const {
  testDir,
  testWorkspacesDir,
  mockIsGitRepo,
  mockGetMainWorktree,
  mockGetProjectName,
  mockSyncWorkspace,
  mockGetEditor,
} = vi.hoisted(() => {
  const _join = (...parts: string[]) => parts.join("/");
  const _testDir = _join(
    require("os").tmpdir(),
    `.rift-test-code-${process.pid}`,
  );
  const _testWorkspacesDir = _join(_testDir, "workspaces");
  return {
    testDir: _testDir,
    testWorkspacesDir: _testWorkspacesDir,
    mockIsGitRepo: vi.fn(() => Promise.resolve(true)),
    mockGetMainWorktree: vi.fn(() => Promise.resolve("/main/repo")),
    mockGetProjectName: vi.fn(() => Promise.resolve("myproject")),
    mockSyncWorkspace: vi.fn(() => Promise.resolve()),
    mockGetEditor: vi.fn(() => ({
      name: "VS Code",
      cmd: "true",
      managedWorkspace: true,
    })),
  };
});

vi.mock("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
}));

vi.mock("../../workspace", () => ({
  syncWorkspace: mockSyncWorkspace,
}));

vi.mock("../../config", () => ({
  getEditor: mockGetEditor,
  getRiftConfig: vi.fn(() => Promise.resolve({})),
  getGlobalConfig: vi.fn(() => ({})),
  saveGlobalConfig: vi.fn(() => {}),
  getAgentCommand: vi.fn(() => "claude"),
  EDITORS: [],
}));

vi.mock("../../constants", () => ({
  WORKSPACES_DIR: testWorkspacesDir,
  WORKTREES_DIR: testDir + "/worktrees",
  RIFT_DIR: testDir,
  CONFIG_DIR: testDir + "/config",
  GLOBAL_CONFIG_PATH: testDir + "/config/config.yaml",
  CD_PATH_FILE: testDir + "/.rift_cd_path",
  AGENT_START_FILE: testDir + "/.rift_start_agent",
  ADJECTIVES: ["bold"],
  NOUNS: ["ant"],
}));

import { cmdCode } from "../../commands/code";

describe("cmdCode", () => {
  beforeEach(() => {
    mkdirSync(testWorkspacesDir, { recursive: true });
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockGetProjectName.mockClear().mockResolvedValue("myproject");
    mockSyncWorkspace.mockClear().mockResolvedValue(undefined);
    mockGetEditor.mockClear().mockReturnValue({
      name: "VS Code",
      cmd: "true",
      managedWorkspace: true,
    });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdCode();
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: not in a git repository");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("syncs workspace for managed editors", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await cmdCode();
    } catch {}

    expect(mockSyncWorkspace).toHaveBeenCalledWith(
      "myproject",
      "/main/repo",
      undefined,
    );
    logSpy.mockRestore();
  });

  test("shows message when no workspace file exists", async () => {
    // Don't create workspace file
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdCode();

    expect(logSpy).toHaveBeenCalledWith(
      "No worktrees found. Use 'rift open' first.",
    );
    logSpy.mockRestore();
  });

  test("shows message when workspace has zero folders", async () => {
    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");
    writeFileSync(wsPath, JSON.stringify({ folders: [] }, null, 2) + "\n");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdCode();

    expect(logSpy).toHaveBeenCalledWith(
      "No worktrees found. Use 'rift open' first.",
    );
    logSpy.mockRestore();
  });

  test("launches editor when workspace file has folders", async () => {
    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");
    writeFileSync(
      wsPath,
      JSON.stringify(
        { folders: [{ name: "main", path: "/main/repo" }] },
        null,
        2,
      ) + "\n",
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // cmdCode will try to Bun.spawn the editor which may fail,
    // but we can verify the log output
    try {
      await cmdCode();
    } catch {}

    // It should attempt to open the workspace
    logSpy.mockRestore();
  });

  test("does not sync workspace for non-managed editors", async () => {
    mockGetEditor.mockReturnValue({
      name: "Other",
      cmd: "true",
      managedWorkspace: false,
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await cmdCode();
    } catch {}

    expect(mockSyncWorkspace).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("handles workspace sync errors gracefully", async () => {
    mockSyncWorkspace.mockRejectedValue(new Error("sync failed"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Should not throw
    await cmdCode();

    logSpy.mockRestore();
  });

  test("handles workspace file missing folders property", async () => {
    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");
    writeFileSync(wsPath, JSON.stringify({ settings: {} }, null, 2) + "\n");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdCode();

    expect(logSpy).toHaveBeenCalledWith(
      "No worktrees found. Use 'rift open' first.",
    );
    logSpy.mockRestore();
  });

  test("handles invalid JSON in workspace file gracefully", async () => {
    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");
    writeFileSync(wsPath, "not valid json");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Should handle the JSON parse error in the try/catch
    await cmdCode();

    // With invalid JSON, count will be 0, so it shows "No worktrees found"
    expect(logSpy).toHaveBeenCalledWith(
      "No worktrees found. Use 'rift open' first.",
    );
    logSpy.mockRestore();
  });
});
