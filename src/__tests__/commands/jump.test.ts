import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const {
  mockIsGitRepo,
  mockGetMainWorktree,
  mockGetProjectName,
  mockListRiftWorktrees,
  mockWriteCdPath,
  mockSignalAgentStart,
  mockRunHook,
  mockWarnIfAgentMissing,
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
  mockWriteCdPath: vi.fn(() => {}),
  mockSignalAgentStart: vi.fn(() => {}),
  mockRunHook: vi.fn(() => Promise.resolve()),
  mockWarnIfAgentMissing: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
  listRiftWorktrees: mockListRiftWorktrees,
}));

vi.mock("../../ipc", () => ({
  writeCdPath: mockWriteCdPath,
  signalAgentStart: mockSignalAgentStart,
}));

vi.mock("../../hooks", () => ({
  runHook: mockRunHook,
}));

vi.mock("../../config", () => ({
  warnIfAgentMissing: mockWarnIfAgentMissing,
}));

import { cmdJump } from "../../commands/jump";

describe("cmdJump", () => {
  const origShellPid = process.env.RIFT_SHELL_PID;

  beforeEach(() => {
    process.env.RIFT_SHELL_PID = "12345";
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockGetProjectName.mockClear().mockResolvedValue("myproject");
    mockListRiftWorktrees.mockClear().mockResolvedValue([
      { path: "/worktrees/myproject/bold-ant", branch: "bold-ant" },
      { path: "/worktrees/myproject/calm-bee", branch: "calm-bee" },
    ]);
    mockWriteCdPath.mockClear();
    mockSignalAgentStart.mockClear();
    mockRunHook.mockClear().mockResolvedValue(undefined);
    mockWarnIfAgentMissing.mockClear().mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (origShellPid !== undefined) {
      process.env.RIFT_SHELL_PID = origShellPid;
    } else {
      delete process.env.RIFT_SHELL_PID;
    }
  });

  test("exits with usage error when no name provided", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdJump([]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith(
      "Usage: rift jump <name> [--skip-agent] [--skip-hooks]",
    );
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdJump(["bold-ant"]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith("Error: not in a git repository");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("exits with error when worktree not found", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdJump(["nonexistent"]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: worktree "nonexistent" not found',
    );
    // Should also list available worktrees
    expect(errorSpy).toHaveBeenCalledWith("Available worktrees:");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("shows no available worktrees list when none exist", async () => {
    mockListRiftWorktrees.mockResolvedValue([]);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdJump(["nonexistent"]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: worktree "nonexistent" not found',
    );
    // Should NOT call "Available worktrees:" when list is empty
    const calls = errorSpy.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain("Available worktrees:");
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("jumps to matching worktree", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["bold-ant"]);

    expect(logSpy).toHaveBeenCalledWith("Jumping to: bold-ant");
    expect(mockWriteCdPath).toHaveBeenCalledWith(
      "/worktrees/myproject/bold-ant",
    );
    expect(mockSignalAgentStart).toHaveBeenCalled();
    expect(mockRunHook).toHaveBeenCalledWith(
      "jump",
      "/worktrees/myproject/bold-ant",
    );
    logSpy.mockRestore();
  });

  test("--skip-agent prevents agent start", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["bold-ant", "--skip-agent"]);

    expect(mockSignalAgentStart).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("filters --skip-agent from positional args", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["--skip-agent", "calm-bee"]);

    expect(logSpy).toHaveBeenCalledWith("Jumping to: calm-bee");
    expect(mockWriteCdPath).toHaveBeenCalledWith(
      "/worktrees/myproject/calm-bee",
    );
    logSpy.mockRestore();
  });

  test("--skip-hooks prevents running jump hook", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["bold-ant", "--skip-hooks"]);

    expect(mockRunHook).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("filters --skip-hooks from positional args", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["--skip-hooks", "calm-bee"]);

    expect(logSpy).toHaveBeenCalledWith("Jumping to: calm-bee");
    expect(mockWriteCdPath).toHaveBeenCalledWith(
      "/worktrees/myproject/calm-bee",
    );
    logSpy.mockRestore();
  });

  test("shows hint when shell wrapper is not active", async () => {
    delete process.env.RIFT_SHELL_PID;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["bold-ant"]);

    expect(logSpy).toHaveBeenCalledWith("Worktree: bold-ant");
    expect(logSpy).toHaveBeenCalledWith(
      "Path: /worktrees/myproject/bold-ant",
    );
    expect(mockWriteCdPath).not.toHaveBeenCalled();
    expect(mockSignalAgentStart).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("jump base switches to main repo and starts agent", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["base"]);

    expect(logSpy).toHaveBeenCalledWith("Jumping to: base");
    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    expect(mockSignalAgentStart).toHaveBeenCalled();
    expect(mockRunHook).toHaveBeenCalledWith("jump", "/main/repo");
    logSpy.mockRestore();
  });

  test("jump main switches to main repo and starts agent", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["main"]);

    expect(logSpy).toHaveBeenCalledWith("Jumping to: base");
    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    expect(mockSignalAgentStart).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("jump base with --skip-agent prevents agent start", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["base", "--skip-agent"]);

    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    expect(mockSignalAgentStart).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("jump base with --skip-hooks skips hooks", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["base", "--skip-hooks"]);

    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    expect(mockRunHook).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("jump base shows hint when shell wrapper is not active", async () => {
    delete process.env.RIFT_SHELL_PID;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["base"]);

    expect(logSpy).toHaveBeenCalledWith("Worktree: base");
    expect(logSpy).toHaveBeenCalledWith("Path: /main/repo");
    expect(mockWriteCdPath).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
