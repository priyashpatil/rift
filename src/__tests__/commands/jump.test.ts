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

mock.module("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
  getProjectName: mockGetProjectName,
  listRiftWorktrees: mockListRiftWorktrees,
}));

const mockWriteCdPath = mock(() => {});
const mockSignalAgentStart = mock(() => {});
mock.module("../../ipc", () => ({
  writeCdPath: mockWriteCdPath,
  signalAgentStart: mockSignalAgentStart,
}));

const mockRunHook = mock(() => Promise.resolve());
mock.module("../../hooks", () => ({
  runHook: mockRunHook,
}));

import { cmdJump } from "../../commands/jump";

describe("cmdJump", () => {
  beforeEach(() => {
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
  });

  test("exits with usage error when no name provided", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdJump([]);
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith(
      "Usage: rift jump <name> [--skip-agent]",
    );
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
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
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
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
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
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
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

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
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["bold-ant", "--skip-agent"]);

    expect(mockSignalAgentStart).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("filters --skip-agent from positional args", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdJump(["--skip-agent", "calm-bee"]);

    expect(logSpy).toHaveBeenCalledWith("Jumping to: calm-bee");
    expect(mockWriteCdPath).toHaveBeenCalledWith(
      "/worktrees/myproject/calm-bee",
    );
    logSpy.mockRestore();
  });
});
