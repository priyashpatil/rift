import { describe, expect, test, mock, spyOn, beforeEach, afterEach } from "bun:test";

const mockIsGitRepo = mock(() => Promise.resolve(true));
const mockGetMainWorktree = mock(() => Promise.resolve("/main/repo"));
const mockGetProjectName = mock(() => Promise.resolve("myproject"));
const mockGetCurrentBranch = mock(() => Promise.resolve("main"));
const mockWorktreeAdd = mock(() => Promise.resolve());

mock.module("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
  getCurrentBranch: mockGetCurrentBranch,
  worktreeAdd: mockWorktreeAdd,
}));

const mockGenerateName = mock(() => "bold-ant");
mock.module("../../names", () => ({
  generateName: mockGenerateName,
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
const mockSignalAgentStart = mock(() => {});
mock.module("../../ipc", () => ({
  writeCdPath: mockWriteCdPath,
  signalAgentStart: mockSignalAgentStart,
}));

const mockGetEditor = mock(() => ({
  name: "VS Code",
  cmd: "code",
  managedWorkspace: true,
}));
const mockWarnIfAgentMissing = mock(() => Promise.resolve());
mock.module("../../config", () => ({
  getEditor: mockGetEditor,
  warnIfAgentMissing: mockWarnIfAgentMissing,
  getRiftConfig: mock(() => Promise.resolve({})),
  getGlobalConfig: mock(() => ({})),
  saveGlobalConfig: mock(() => {}),
  getAgentCommand: mock(() => "claude"),
  EDITORS: [],
}));

// Mock fs.existsSync to return false (worktree doesn't exist yet)
const origExistsSync = (await import("fs")).existsSync;
const mockExistsSync = mock((path: string) => {
  if (typeof path === "string" && path.includes("worktrees")) return false;
  return origExistsSync(path);
});

import { cmdOpen } from "../../commands/open";

describe("cmdOpen", () => {
  const origShellPid = process.env.RIFT_SHELL_PID;

  beforeEach(() => {
    process.env.RIFT_SHELL_PID = "12345";
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
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
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
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
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
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdOpen(["name1", "name2"]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith(
      "Error: unexpected argument: name2",
    );
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("generates a name when none provided", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockGenerateName).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("uses provided name", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["my-worktree"]);

    expect(mockGenerateName).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Created worktree: my-worktree");
    logSpy.mockRestore();
  });

  test("parses --base flag", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["--base", "develop"]);

    expect(mockWorktreeAdd).toHaveBeenCalled();
    const call = mockWorktreeAdd.mock.calls[0];
    expect(call[3]).toBe("develop"); // base argument
    logSpy.mockRestore();
  });

  test("parses --base= syntax", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["--base=develop"]);

    const call = mockWorktreeAdd.mock.calls[0];
    expect(call[3]).toBe("develop");
    logSpy.mockRestore();
  });

  test("--skip-agent prevents signalAgentStart", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["--skip-agent"]);

    expect(mockSignalAgentStart).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("signals agent start by default", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockSignalAgentStart).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("runs open hook", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockRunHook).toHaveBeenCalledWith("open", expect.any(String));
    logSpy.mockRestore();
  });

  test("--skip-hooks prevents running open hook", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen(["--skip-hooks"]);

    expect(mockRunHook).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("syncs workspace when editor has managedWorkspace", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockSyncWorkspace).toHaveBeenCalledWith("myproject", "/main/repo", undefined);
    logSpy.mockRestore();
  });

  test("skips workspace sync when editor is not managed", async () => {
    mockGetEditor.mockReturnValue({
      name: "Other",
      cmd: "other",
      managedWorkspace: false,
    });
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockSyncWorkspace).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("shows hint instead of cd/agent when shell wrapper is not active", async () => {
    delete process.env.RIFT_SHELL_PID;
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdOpen([]);

    expect(mockWriteCdPath).not.toHaveBeenCalled();
    expect(mockSignalAgentStart).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
