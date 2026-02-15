import { describe, expect, test, mock, spyOn, beforeEach } from "bun:test";

const mockIsGitRepo = mock(() => Promise.resolve(true));
const mockGetMainWorktree = mock(() => Promise.resolve("/main/repo"));
const mockWriteCdPath = mock(() => {});

mock.module("../../git", () => ({
  isGitRepo: mockIsGitRepo,
  getMainWorktree: mockGetMainWorktree,
}));

mock.module("../../ipc", () => ({
  writeCdPath: mockWriteCdPath,
}));

import { cmdMain } from "../../commands/main";

describe("cmdMain", () => {
  beforeEach(() => {
    mockIsGitRepo.mockClear();
    mockGetMainWorktree.mockClear();
    mockWriteCdPath.mockClear();
  });

  test("writes cd path and logs message on success", async () => {
    mockIsGitRepo.mockResolvedValue(true);
    mockGetMainWorktree.mockResolvedValue("/main/repo");
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdMain();

    expect(mockWriteCdPath).toHaveBeenCalledWith("/main/repo");
    expect(logSpy).toHaveBeenCalledWith("Switching to: /main/repo");
    logSpy.mockRestore();
  });

  test("exits with error when not in a git repo", async () => {
    mockIsGitRepo.mockResolvedValue(false);
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await cmdMain();
    } catch (e: any) {
      expect(e.message).toBe("process.exit");
    }

    expect(errorSpy).toHaveBeenCalledWith("Error: not in a git repository");
    expect(exitSpy).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
