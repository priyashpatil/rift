import { describe, expect, test, vi, beforeEach } from "vitest";

const {
  mockExistsSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockMkdirSync,
  mockGetMainWorktree,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(() => true),
  mockReadFileSync: vi.fn(() => "agent: codex\n"),
  mockWriteFileSync: vi.fn(() => {}),
  mockMkdirSync: vi.fn(() => undefined as any),
  mockGetMainWorktree: vi.fn(() => Promise.resolve("/main/repo")),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
  };
});

vi.mock("../git", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../git")>();
  return {
    ...actual,
    getMainWorktree: mockGetMainWorktree,
  };
});

import {
  getRiftConfig,
  saveRiftConfig,
  getGlobalConfig,
  saveGlobalConfig,
  getAgentCommand,
  warnIfAgentMissing,
} from "../config";

describe("config (mocked)", () => {
  beforeEach(() => {
    mockGetMainWorktree.mockClear().mockResolvedValue("/main/repo");
    mockExistsSync.mockClear().mockReturnValue(true);
    mockReadFileSync.mockClear().mockReturnValue("agent: codex\n");
    mockWriteFileSync.mockClear();
    mockMkdirSync.mockClear();
  });

  describe("getRiftConfig", () => {
    test("returns parsed config when rift.yaml exists", async () => {
      const config = await getRiftConfig();
      expect(config).toEqual({ agent: "codex" });
    });

    test("returns empty object when config file doesn't exist", async () => {
      mockExistsSync.mockReturnValue(false);
      const config = await getRiftConfig();
      expect(config).toEqual({});
    });

    test("returns empty object on read error", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("EACCES");
      });
      const config = await getRiftConfig();
      expect(config).toEqual({});
    });

    test("returns empty object when getMainWorktree throws", async () => {
      mockGetMainWorktree.mockRejectedValue(new Error("not a git repo"));
      const config = await getRiftConfig();
      expect(config).toEqual({});
    });

    test("accepts optional dir parameter", async () => {
      await getRiftConfig("/some/dir");
      expect(mockGetMainWorktree).toHaveBeenCalledWith("/some/dir");
    });
  });

  describe("saveRiftConfig", () => {
    test("throws when rift.yaml doesn't exist", async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(saveRiftConfig({ agent: "aider" })).rejects.toThrow(
        "no rift.yaml found",
      );
    });

    test("merges updates with existing config", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("agent: codex\n");

      await saveRiftConfig({ agent: "aider" });

      expect(mockWriteFileSync).toHaveBeenCalled();
      const written = mockWriteFileSync.mock.calls[0][1] as string;
      expect(written).toContain("aider");
    });
  });

  describe("getGlobalConfig", () => {
    test("returns empty object when config file doesn't exist", () => {
      mockExistsSync.mockReturnValue(false);
      const config = getGlobalConfig();
      expect(config).toEqual({});
    });

    test("returns parsed config when file exists", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("agent: amp\n");
      const config = getGlobalConfig();
      expect(config).toEqual({ agent: "amp" });
    });

    test("returns empty object on parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("EACCES");
      });
      const config = getGlobalConfig();
      expect(config).toEqual({});
    });
  });

  describe("saveGlobalConfig", () => {
    test("creates config dir and writes YAML", () => {
      saveGlobalConfig({ agent: "copilot" });
      expect(mockMkdirSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalled();
      const written = mockWriteFileSync.mock.calls[0][1] as string;
      expect(written).toContain("copilot");
    });
  });

  describe("getAgentCommand", () => {
    test("returns project config agent when set", async () => {
      mockReadFileSync.mockReturnValue("agent: aider\n");
      const cmd = await getAgentCommand();
      expect(cmd).toBe("aider");
    });

    test("defaults to codex when nothing configured", async () => {
      mockExistsSync.mockReturnValue(false);
      const cmd = await getAgentCommand();
      expect(cmd).toBe("codex");
    });
  });

  describe("warnIfAgentMissing", () => {
    test("warns when agent binary not found on PATH", async () => {
      mockReadFileSync.mockReturnValue("agent: nonexistent-agent-xyz\n");
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await warnIfAgentMissing();

      expect(errorSpy).toHaveBeenCalledWith(
        'Warning: agent command "nonexistent-agent-xyz" not found on PATH',
      );
      errorSpy.mockRestore();
    });

    test("does not warn when agent binary exists", async () => {
      mockReadFileSync.mockReturnValue("agent: echo\n");
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await warnIfAgentMissing();

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    test("extracts first word of multi-word agent command", async () => {
      mockReadFileSync.mockReturnValue("agent: echo hello world\n");
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await warnIfAgentMissing();

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
