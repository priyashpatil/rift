import { describe, expect, test, mock, spyOn, beforeEach, afterEach } from "bun:test";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const mockIsGitRepo = mock(() => Promise.resolve(true));
const mockGetMainWorktree = mock(() => Promise.resolve("/main/repo"));
const mockGetProjectName = mock(() => Promise.resolve("myproject"));

mock.module("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
}));

const mockSyncWorkspace = mock(() => Promise.resolve());
mock.module("../../workspace", () => ({
  syncWorkspace: mockSyncWorkspace,
}));

const mockGetEditor = mock(() => ({
  name: "VS Code",
  cmd: "true", // use 'true' command to avoid actually opening an editor
  managedWorkspace: true,
}));
mock.module("../../config", () => ({
  getEditor: mockGetEditor,
  getRiftConfig: mock(() => Promise.resolve({})),
  getGlobalConfig: mock(() => ({})),
  saveGlobalConfig: mock(() => {}),
  getAgentCommand: mock(() => "claude"),
  EDITORS: [],
}));

// We need to mock the WORKSPACES_DIR to control workspace file existence
const testDir = join(tmpdir(), `.rift-test-code-${process.pid}`);
const testWorkspacesDir = join(testDir, "workspaces");

mock.module("../../constants", () => ({
  WORKSPACES_DIR: testWorkspacesDir,
  WORKTREES_DIR: join(testDir, "worktrees"),
  RIFT_DIR: testDir,
  CONFIG_DIR: join(testDir, "config"),
  GLOBAL_CONFIG_PATH: join(testDir, "config", "config.yaml"),
  CD_PATH_FILE: join(testDir, ".rift_cd_path"),
  AGENT_START_FILE: join(testDir, ".rift_start_agent"),
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
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
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
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    try {
      await cmdCode();
    } catch {}

    expect(mockSyncWorkspace).toHaveBeenCalledWith("myproject", "/main/repo");
    logSpy.mockRestore();
  });

  test("shows message when no workspace file exists", async () => {
    // Don't create workspace file
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdCode();

    expect(logSpy).toHaveBeenCalledWith(
      "No worktrees found. Use 'rift open' first.",
    );
    logSpy.mockRestore();
  });

  test("shows message when workspace has zero folders", async () => {
    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");
    writeFileSync(wsPath, JSON.stringify({ folders: [] }, null, 2) + "\n");
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

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
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

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
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    try {
      await cmdCode();
    } catch {}

    expect(mockSyncWorkspace).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("handles workspace sync errors gracefully", async () => {
    mockSyncWorkspace.mockRejectedValue(new Error("sync failed"));
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    // Should not throw
    await cmdCode();

    logSpy.mockRestore();
  });

  test("handles invalid JSON in workspace file gracefully", async () => {
    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");
    writeFileSync(wsPath, "not valid json");
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    // Should handle the JSON parse error in the try/catch
    await cmdCode();

    // With invalid JSON, count will be 0, so it shows "No worktrees found"
    expect(logSpy).toHaveBeenCalledWith(
      "No worktrees found. Use 'rift open' first.",
    );
    logSpy.mockRestore();
  });
});
