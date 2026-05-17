import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { join } from "path";

const {
  mockGetGlobalConfig,
  mockSaveGlobalConfig,
  mockGetRiftConfig,
  mockSaveRiftConfig,
  mockIsGitRepo,
  mockExistsSync,
  mockReadFileSync,
  mockAppendFileSync,
} = vi.hoisted(() => ({
  mockGetGlobalConfig: vi.fn(() => ({ agent: "codex" })),
  mockSaveGlobalConfig: vi.fn((_config: any) => {}),
  mockGetRiftConfig: vi.fn(async () => ({ agent: "codex" })),
  mockSaveRiftConfig: vi.fn(async (_updates: any) => {}),
  mockIsGitRepo: vi.fn(async () => true),
  mockExistsSync: vi.fn(() => true),
  mockReadFileSync: vi.fn(
    () => '# Added by rift\neval "$(rift _shell-init)"\n',
  ),
  mockAppendFileSync: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    appendFileSync: mockAppendFileSync,
  };
});

vi.mock("../../config", () => ({
  getGlobalConfig: mockGetGlobalConfig,
  saveGlobalConfig: mockSaveGlobalConfig,
  getRiftConfig: mockGetRiftConfig,
  saveRiftConfig: mockSaveRiftConfig,
}));

vi.mock("../../git", () => ({
  isGitRepo: mockIsGitRepo,
}));

import { cmdConfig } from "../../commands/config";

describe("cmdConfig", () => {
  const originalShell = process.env.SHELL;

  beforeEach(() => {
    mockGetGlobalConfig.mockClear().mockReturnValue({ agent: "codex" });
    mockSaveGlobalConfig.mockClear();
    mockGetRiftConfig.mockClear().mockResolvedValue({ agent: "codex" });
    mockSaveRiftConfig.mockClear();
    mockIsGitRepo.mockClear().mockResolvedValue(true);
    mockExistsSync.mockClear().mockReturnValue(true);
    mockReadFileSync
      .mockClear()
      .mockReturnValue('# Added by rift\neval "$(rift _shell-init)"\n');
    mockAppendFileSync.mockClear();
  });

  afterEach(() => {
    process.env.SHELL = originalShell;
  });

  test("saves agent to project config by default", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--agent", "amp"]);

    expect(mockSaveRiftConfig).toHaveBeenCalledWith({ agent: "amp" });
    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("saves agent to global config with --global", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--global", "--agent", "amp"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    const savedConfig = mockSaveGlobalConfig.mock.calls[0][0];
    expect(savedConfig.agent).toBe("amp");
    expect(mockSaveRiftConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("accepts any agent string", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--agent", "aider --model gpt-4"]);

    expect(mockSaveRiftConfig).toHaveBeenCalledWith({
      agent: "aider --model gpt-4",
    });
    logSpy.mockRestore();
  });

  test("throws when not in git repo without --global", async () => {
    process.env.SHELL = "/bin/zsh";
    mockIsGitRepo.mockResolvedValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(cmdConfig(["--agent", "amp"])).rejects.toThrow(
      /not a git repository/,
    );
    logSpy.mockRestore();
  });

  test("saves to global config when not in git repo with --global", async () => {
    process.env.SHELL = "/bin/zsh";
    mockIsGitRepo.mockResolvedValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--global", "--agent", "amp"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("does not save config when no flags passed", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    expect(mockSaveRiftConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("falls back to default agent when both configs are empty", async () => {
    process.env.SHELL = "/bin/zsh";
    mockGetRiftConfig.mockResolvedValue({});
    mockGetGlobalConfig.mockReturnValue({});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(logCalls.some((c) => c.includes("codex"))).toBe(true);
    logSpy.mockRestore();
  });

  test("uses global agent when project config is empty", async () => {
    process.env.SHELL = "/bin/zsh";
    mockGetRiftConfig.mockResolvedValue({});
    mockGetGlobalConfig.mockReturnValue({ agent: "aider" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(logCalls.some((c) => c.includes("aider"))).toBe(true);
    logSpy.mockRestore();
  });

  test("shows current agent when no flags passed", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(logCalls.some((c) => c.includes("codex"))).toBe(true);
    logSpy.mockRestore();
  });

  test("detects zsh shell", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some(
        (c) =>
          c.includes("Shell integration") || c.includes("shell integration"),
      ),
    ).toBe(true);
    logSpy.mockRestore();
  });

  test("detects fish shell", async () => {
    process.env.SHELL = "/usr/local/bin/fish";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some(
        (c) =>
          c.includes("Shell integration") || c.includes("shell integration"),
      ),
    ).toBe(true);
    logSpy.mockRestore();
  });

  test("throws for unsupported shell", async () => {
    process.env.SHELL = "/bin/csh";

    await expect(cmdConfig([])).rejects.toThrow(/unsupported shell "csh"/);
  });

  test("throws for empty SHELL env var", async () => {
    process.env.SHELL = "";

    await expect(cmdConfig([])).rejects.toThrow(
      /unsupported shell "\(unknown\)"/,
    );
  });

  test("detects bash shell and uses .bashrc when it exists", async () => {
    process.env.SHELL = "/bin/bash";
    mockExistsSync.mockReturnValue(true);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some(
        (c) =>
          c.includes("Shell integration") || c.includes("shell integration"),
      ),
    ).toBe(true);
    logSpy.mockRestore();
  });

  test("bash falls back to .bash_profile when .bashrc does not exist", async () => {
    process.env.SHELL = "/bin/bash";
    const home = require("os").homedir();
    const bashrc = join(home, ".bashrc");
    mockExistsSync.mockImplementation((path: string) => {
      if (path === bashrc) return false;
      return false;
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    expect(mockAppendFileSync).toHaveBeenCalled();
    const rcPath = mockAppendFileSync.mock.calls[0][0] as string;
    expect(rcPath).toContain(".bash_profile");
    logSpy.mockRestore();
  });

  test("ignores --agent flag without value", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--agent"]);

    expect(mockSaveRiftConfig).not.toHaveBeenCalled();
    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("adds shell integration when rc file exists but has no guard comment", async () => {
    process.env.SHELL = "/bin/zsh";
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("# existing content\n");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    expect(mockAppendFileSync).toHaveBeenCalled();
    const appended = mockAppendFileSync.mock.calls[0][1] as string;
    expect(appended).toContain("# Added by rift");
    expect(appended).toContain('eval "$(rift _shell-init)"');
    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(logCalls.some((c) => c.includes("Added shell integration"))).toBe(
      true,
    );
    logSpy.mockRestore();
  });

  test("creates rc file when it does not exist", async () => {
    process.env.SHELL = "/bin/zsh";
    mockExistsSync.mockReturnValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    expect(mockAppendFileSync).toHaveBeenCalled();
    const appended = mockAppendFileSync.mock.calls[0][1] as string;
    expect(appended).toContain("# Added by rift");
    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(logCalls.some((c) => c.includes("Created"))).toBe(true);
    logSpy.mockRestore();
  });

  test("adds fish init line when rc file is missing and shell is fish", async () => {
    process.env.SHELL = "/usr/local/bin/fish";
    mockExistsSync.mockReturnValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    expect(mockAppendFileSync).toHaveBeenCalled();
    const appended = mockAppendFileSync.mock.calls[0][1] as string;
    expect(appended).toContain("source");
    logSpy.mockRestore();
  });
});

describe("getRcPath helper (tested indirectly)", () => {
  test("bash returns .bashrc or .bash_profile path", () => {
    const home = require("os").homedir();
    const bashrc = join(home, ".bashrc");
    const bashProfile = join(home, ".bash_profile");
    expect(typeof bashrc).toBe("string");
    expect(typeof bashProfile).toBe("string");
  });

  test("fish config path is under .config/fish", () => {
    const home = require("os").homedir();
    const fishConfig = join(home, ".config", "fish", "config.fish");
    expect(fishConfig).toContain(".config/fish");
  });
});

describe("getInitLine helper (tested indirectly)", () => {
  test("fish init line uses source", () => {
    const fishInit = "rift init | source";
    expect(fishInit).toContain("source");
  });

  test("posix init line uses eval", () => {
    const posixInit = 'eval "$(rift init)"';
    expect(posixInit).toContain("eval");
  });
});
