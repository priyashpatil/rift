import { describe, expect, test, vi, beforeEach } from "vitest";

const {
  mockIsGitRepo,
  mockGetMainWorktree,
  mockGetGlobalConfig,
  mockExistsSync,
  mockWriteFileSync,
} = vi.hoisted(() => ({
  mockIsGitRepo: vi.fn(() => Promise.resolve(true)),
  mockGetMainWorktree: vi.fn(() => Promise.resolve("/main/repo")),
  mockGetGlobalConfig: vi.fn(() => ({})),
  mockExistsSync: vi.fn(() => false),
  mockWriteFileSync: vi.fn(() => {}),
}));

vi.mock("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
}));

vi.mock("../../config", () => ({
  getGlobalConfig: mockGetGlobalConfig,
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: mockExistsSync,
    writeFileSync: mockWriteFileSync,
  };
});

import { cmdInit } from "../../commands/init";

describe("cmdInit", () => {
  beforeEach(() => {
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockGetGlobalConfig.mockClear().mockReturnValue({});
    mockExistsSync.mockClear().mockReturnValue(false);
    mockWriteFileSync.mockClear();
  });

  test("throws when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    await expect(cmdInit([])).rejects.toThrow("not a git repository");
  });

  test("throws when rift.yaml already exists", async () => {
    mockExistsSync.mockReturnValue(true);
    await expect(cmdInit([])).rejects.toThrow("rift.yaml already exists");
  });

  test("creates rift.yaml with default agent", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdInit([]);

    expect(mockWriteFileSync).toHaveBeenCalled();
    const content = mockWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain("agent: codex");
    logSpy.mockRestore();
  });

  test("parses --agent flag", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdInit(["--agent", "aider"]);

    const content = mockWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain("agent: aider");
    logSpy.mockRestore();
  });

  test("uses global agent default when flag is missing", async () => {
    mockGetGlobalConfig.mockReturnValue({
      agent: "copilot",
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdInit([]);

    const content = mockWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain("agent: copilot");
    logSpy.mockRestore();
  });

  test("shows success message", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdInit([]);

    expect(logSpy).toHaveBeenCalledWith("Initialized rift.yaml in /main/repo");
    expect(logSpy).toHaveBeenCalledWith("  agent:  codex");
    logSpy.mockRestore();
  });

  test("ignores --agent flag without value", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdInit(["--agent"]);

    const content = mockWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain("agent: codex");
    logSpy.mockRestore();
  });

  test("config content includes hooks section", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdInit([]);

    const content = mockWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain("hooks:");
    expect(content).toContain("# open:");
    expect(content).toContain("# close:");
    logSpy.mockRestore();
  });
});
