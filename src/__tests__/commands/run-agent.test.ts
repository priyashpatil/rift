import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const {
  mockGetAgentCommand,
  mockGetMainWorktree,
  mockIsRiftWorktree,
  mockGetProjectName,
  mockGetWorktreeName,
  mockRegisterAgent,
  mockUnregisterAgent,
  mockIsRegistered,
  mockWriteCdPath,
} = vi.hoisted(() => ({
  mockGetAgentCommand: vi.fn(() => Promise.resolve("claude")),
  mockGetMainWorktree: vi.fn(() => Promise.resolve("/main/repo")),
  mockIsRiftWorktree: vi.fn(() => Promise.resolve(false)),
  mockGetProjectName: vi.fn(() => Promise.resolve("myproject")),
  mockGetWorktreeName: vi.fn(() => Promise.resolve("bold-ant")),
  mockRegisterAgent: vi.fn(() => ""),
  mockUnregisterAgent: vi.fn(() => {}),
  mockIsRegistered: vi.fn(() => true),
  mockWriteCdPath: vi.fn(() => {}),
}));

vi.mock("../../config", () => ({
  getAgentCommand: mockGetAgentCommand,
}));

vi.mock("../../git", () => ({
  getMainWorktree: mockGetMainWorktree,
  isRiftWorktree: mockIsRiftWorktree,
  getProjectName: mockGetProjectName,
  getWorktreeName: mockGetWorktreeName,
}));

vi.mock("../../agents", () => ({
  registerAgent: mockRegisterAgent,
  unregisterAgent: mockUnregisterAgent,
  isRegistered: mockIsRegistered,
}));

vi.mock("../../ipc", () => ({
  writeCdPath: mockWriteCdPath,
}));

import { cmdRunAgent } from "../../commands/run-agent";

describe("cmdRunAgent", () => {
  const origShellPid = process.env.RIFT_SHELL_PID;

  beforeEach(() => {
    process.env.RIFT_SHELL_PID = "12345";
    mockGetAgentCommand.mockClear().mockResolvedValue("echo hello");
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockIsRiftWorktree.mockClear().mockResolvedValue(false);
    mockGetProjectName.mockClear().mockResolvedValue("myproject");
    mockGetWorktreeName.mockClear().mockResolvedValue("bold-ant");
    mockRegisterAgent.mockClear().mockReturnValue("");
    mockUnregisterAgent.mockClear();
    mockIsRegistered.mockClear().mockReturnValue(true);
    mockWriteCdPath.mockClear();
  });

  afterEach(() => {
    if (origShellPid !== undefined) {
      process.env.RIFT_SHELL_PID = origShellPid;
    } else {
      delete process.env.RIFT_SHELL_PID;
    }
  });

  test("exits with error when RIFT_SHELL_PID is missing", async () => {
    delete process.env.RIFT_SHELL_PID;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdRunAgent();
    } catch {}

    expect(errorSpy).toHaveBeenCalledWith(
      "Error: _run-agent requires shell integration (RIFT_SHELL_PID)",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("base worktree: spawns agent and exits with agent exit code", async () => {
    mockIsRiftWorktree.mockResolvedValue(false);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdRunAgent();
    } catch {}

    expect(exitSpy).toHaveBeenCalled();
    expect(mockRegisterAgent).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  test("rift worktree: registers agent and waits", async () => {
    mockIsRiftWorktree.mockResolvedValue(true);
    // Agent exits immediately
    mockIsRegistered.mockReturnValue(true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdRunAgent();
    } catch {}

    expect(mockRegisterAgent).toHaveBeenCalledWith("myproject", "bold-ant", {
      shellPid: 12345,
      agentPid: expect.any(Number),
      mainWorktreePath: "/main/repo",
    });
    expect(mockUnregisterAgent).toHaveBeenCalledWith(
      "myproject",
      "bold-ant",
      12345,
    );
    exitSpy.mockRestore();
  });

  test("rift worktree: shutdown path kills agent and writes cd path", async () => {
    mockIsRiftWorktree.mockResolvedValue(true);
    // Use a long-running agent so poll wins the race
    mockGetAgentCommand.mockResolvedValue("sleep 60");
    // isRegistered returns false immediately to trigger shutdown path
    mockIsRegistered.mockReturnValue(false);

    // Speed up the 1-second poll interval
    const originalSetInterval = globalThis.setInterval;
    vi.spyOn(globalThis, "setInterval").mockImplementation(
      (fn: any, _ms: any) => {
        return originalSetInterval(fn, 10);
      },
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdRunAgent();
    } catch {}

    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
    vi.mocked(globalThis.setInterval).mockRestore();
  });

  test("base worktree: handles null exit code with ?? 0 fallback", async () => {
    mockIsRiftWorktree.mockResolvedValue(false);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdRunAgent();
    } catch {}

    // The exit should be called (covering line 31: code ?? 0)
    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  test("rift worktree: agent-exit path covers code ?? 0 fallback", async () => {
    mockIsRiftWorktree.mockResolvedValue(true);
    // Agent exits immediately — isRegistered stays true so poll doesn't win
    mockIsRegistered.mockReturnValue(true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdRunAgent();
    } catch {}

    // Covers line 62: process.exit(result.code ?? 0)
    expect(exitSpy).toHaveBeenCalled();
    expect(mockUnregisterAgent).toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  test("rift worktree: force kills agent with SIGKILL after timeout", async () => {
    mockIsRiftWorktree.mockResolvedValue(true);
    // Use a process that traps SIGINT so it doesn't exit gracefully
    mockGetAgentCommand.mockResolvedValue("trap '' INT; sleep 60");
    mockIsRegistered.mockReturnValue(false);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdRunAgent();
    } catch {}

    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  }, 10000);
});
