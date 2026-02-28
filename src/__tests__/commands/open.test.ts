import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const { mockExistsSyncOpen, mockMkdirSyncOpen } = vi.hoisted(() => ({
  mockExistsSyncOpen: vi.fn(() => false),
  mockMkdirSyncOpen: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: mockExistsSyncOpen,
    mkdirSync: mockMkdirSyncOpen,
  };
});

const {
  mockIsGitRepo,
  mockGetMainWorktree,
  mockGetProjectName,
  mockGetCurrentBranch,
  mockWorktreeAdd,
  mockGenerateName,
  mockSyncWorkspace,
  mockRunHook,
  mockWriteCdPath,
  mockSignalAgentStart,
  mockGetEditor,
  mockWarnIfAgentMissing,
} = vi.hoisted(() => ({
  mockIsGitRepo: vi.fn(() => Promise.resolve(true)),
  mockGetMainWorktree: vi.fn(() => Promise.resolve("/main/repo")),
  mockGetProjectName: vi.fn(() => Promise.resolve("myproject")),
  mockGetCurrentBranch: vi.fn(() => Promise.resolve("main")),
  mockWorktreeAdd: vi.fn(() => Promise.resolve()),
  mockGenerateName: vi.fn(() => "bold-ant"),
  mockSyncWorkspace: vi.fn(() => Promise.resolve()),
  mockRunHook: vi.fn(() => Promise.resolve()),
  mockWriteCdPath: vi.fn(() => {}),
  mockSignalAgentStart: vi.fn(() => {}),
  mockGetEditor: vi.fn(() => ({
    name: "VS Code",
    cmd: "code",
    managedWorkspace: true,
  })),
  mockWarnIfAgentMissing: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
  getCurrentBranch: mockGetCurrentBranch,
  worktreeAdd: mockWorktreeAdd,
}));

vi.mock("../../names", () => ({
  generateName: mockGenerateName,
}));

vi.mock("../../workspace", () => ({
  syncWorkspace: mockSyncWorkspace,
}));

vi.mock("../../hooks", () => ({
  runHook: mockRunHook,
}));

vi.mock("../../ipc", () => ({
  writeCdPath: mockWriteCdPath,
  signalAgentStart: mockSignalAgentStart,
}));

vi.mock("../../config", () => ({
  getEditor: mockGetEditor,
  warnIfAgentMissing: mockWarnIfAgentMissing,
  getRiftConfig: vi.fn(() => Promise.resolve({})),
  getGlobalConfig: vi.fn(() => ({})),
  saveGlobalConfig: vi.fn(() => {}),
  getAgentCommand: vi.fn(() => "claude"),
  EDITORS: [],
}));

import { cmdOpen } from "../../commands/open";

describe("cmdOpen", () => {
  const origShellPid = process.env.RIFT_SHELL_PID;

  beforeEach(() => {
    process.env.RIFT_SHELL_PID = "12345";
    mockExistsSyncOpen.mockClear().mockReturnValue(false);
    mockMkdirSyncOpen.mockClear();
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockGetProjectName.mockClear().mockResolvedValue("myproject");
    mockGetCurrentBranch.mockClear().mockResolvedValue("main");
    mockWorktreeAdd.mockClear().mockResolvedValue(undefined);
    mockGenerateName.mockClear().mockReturnValue("bold-ant");
    mockSyncWorkspace.mockClear().mockResolvedValue(undefined);
    mockRunHook.mockClear().mockResolvedValue(undefined);
    mockWriteCdPath.mockClear();
    mockSignalAgentStart.mockClear();
    mockGetEditor.mockClear().mockReturnValue({
      name: "VS Code",
      cmd: "code",
      managedWorkspace: true,
    });
    mockWarnIfAgentMissing.mockClear().mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (origShellPid !== undefined) {
      process.env.RIFT_SHELL_PID = origShellPid;
    } else {
      delete process.env.RIFT_SHELL_PID;
    }
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdOpen([]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: not in a git repository");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("exits with error on unknown option", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdOpen(["--unknown"]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: unknown option: --unknown");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("exits with error on unexpected argument", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdOpen(["name1", "name2"]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: unexpected argument: name2");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("generates a name when none provided", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockGenerateName).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("uses provided name", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["my-worktree"]);

    expect(mockGenerateName).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Created worktree: my-worktree");
    logSpy.mockRestore();
  });

  test("parses --base flag", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["--base", "develop"]);

    expect(mockWorktreeAdd).toHaveBeenCalled();
    const call = mockWorktreeAdd.mock.calls[0];
    expect(call[3]).toBe("develop"); // base argument
    logSpy.mockRestore();
  });

  test("parses --base= syntax", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["--base=develop"]);

    const call = mockWorktreeAdd.mock.calls[0];
    expect(call[3]).toBe("develop");
    logSpy.mockRestore();
  });

  test("--skip-agent prevents signalAgentStart", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["--skip-agent"]);

    expect(mockSignalAgentStart).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("signals agent start by default", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockSignalAgentStart).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("runs open hook", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockRunHook).toHaveBeenCalledWith("open", expect.any(String));
    logSpy.mockRestore();
  });

  test("--skip-hooks prevents running open hook", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["--skip-hooks"]);

    expect(mockRunHook).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("syncs workspace when editor has managedWorkspace", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockSyncWorkspace).toHaveBeenCalledWith(
      "myproject",
      "/main/repo",
      undefined,
    );
    logSpy.mockRestore();
  });

  test("skips workspace sync when editor is not managed", async () => {
    mockGetEditor.mockReturnValue({
      name: "Other",
      cmd: "other",
      managedWorkspace: false,
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockSyncWorkspace).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("shows hint instead of cd/agent when shell wrapper is not active", async () => {
    delete process.env.RIFT_SHELL_PID;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockWriteCdPath).not.toHaveBeenCalled();
    expect(mockSignalAgentStart).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("exits with error when worktree already exists", async () => {
    mockExistsSyncOpen.mockReturnValue(true);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdOpen(["my-worktree"]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: worktree "my-worktree" already exists',
    );
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
