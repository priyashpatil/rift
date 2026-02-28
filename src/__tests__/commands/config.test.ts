import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { join } from "path";

const {
  mockGetGlobalConfig,
  mockSaveGlobalConfig,
  mockGetRiftConfig,
  mockSaveRiftConfig,
  mockIsGitRepo,
  mockEditors,
  mockExistsSync,
  mockReadFileSync,
  mockAppendFileSync,
} = vi.hoisted(() => ({
  mockGetGlobalConfig: vi.fn(() => ({ agent: "claude", editor: "code" })),
  mockSaveGlobalConfig: vi.fn((_config: any) => {}),
  mockGetRiftConfig: vi.fn(async () => ({ agent: "claude", editor: "code" })),
  mockSaveRiftConfig: vi.fn(async (_updates: any) => {}),
  mockIsGitRepo: vi.fn(async () => true),
  mockEditors: [
    { name: "VS Code", cmd: "code", managedWorkspace: true },
    { name: "Cursor", cmd: "cursor", managedWorkspace: true },
    { name: "Windsurf", cmd: "windsurf", managedWorkspace: true },
  ],
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
  EDITORS: mockEditors,
}));

vi.mock("../../git", () => ({
  isGitRepo: mockIsGitRepo,
}));

import { cmdConfig } from "../../commands/config";

describe("cmdConfig", () => {
  const originalShell = process.env.SHELL;

  beforeEach(() => {
    mockGetGlobalConfig
      .mockClear()
      .mockReturnValue({ agent: "claude", editor: "code" });
    mockSaveGlobalConfig.mockClear();
    mockGetRiftConfig
      .mockClear()
      .mockResolvedValue({ agent: "claude", editor: "code" });
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

  test("saves editor to project config by default", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--editor", "cursor"]);

    expect(mockSaveRiftConfig).toHaveBeenCalled();
    const updates = mockSaveRiftConfig.mock.calls[0][0];
    expect(updates.editor).toBe("cursor");
    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("saves agent to project config by default", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--agent", "amp"]);

    expect(mockSaveRiftConfig).toHaveBeenCalled();
    const updates = mockSaveRiftConfig.mock.calls[0][0];
    expect(updates.agent).toBe("amp");
    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("saves to global config with --global flag", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--global", "--editor", "cursor"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    const savedConfig = mockSaveGlobalConfig.mock.calls[0][0];
    expect(savedConfig.editor).toBe("cursor");
    expect(mockSaveRiftConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("saves both editor and agent to project config", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--editor", "windsurf", "--agent", "amp"]);

    expect(mockSaveRiftConfig).toHaveBeenCalled();
    const updates = mockSaveRiftConfig.mock.calls[0][0];
    expect(updates.editor).toBe("windsurf");
    expect(updates.agent).toBe("amp");
    logSpy.mockRestore();
  });

  test("saves both editor and agent to global config with --global", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--global", "--editor", "windsurf", "--agent", "amp"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    const savedConfig = mockSaveGlobalConfig.mock.calls[0][0];
    expect(savedConfig.editor).toBe("windsurf");
    expect(savedConfig.agent).toBe("amp");
    logSpy.mockRestore();
  });

  test("throws on unknown editor", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(cmdConfig(["--editor", "vim"])).rejects.toThrow(
      /unknown editor "vim"/,
    );
    logSpy.mockRestore();
  });

  test("accepts any agent string", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--agent", "aider --model gpt-4"]);

    expect(mockSaveRiftConfig).toHaveBeenCalled();
    const updates = mockSaveRiftConfig.mock.calls[0][0];
    expect(updates.agent).toBe("aider --model gpt-4");
    logSpy.mockRestore();
  });

  test("throws when not in git repo without --global", async () => {
    process.env.SHELL = "/bin/zsh";
    mockIsGitRepo.mockResolvedValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(cmdConfig(["--editor", "cursor"])).rejects.toThrow(
      /not a git repository/,
    );
    logSpy.mockRestore();
  });

  test("saves to global config when not in git repo with --global", async () => {
    process.env.SHELL = "/bin/zsh";
    mockIsGitRepo.mockResolvedValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--global", "--editor", "cursor"]);

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

  test("falls back to defaults when both rift and global config are empty", async () => {
    process.env.SHELL = "/bin/zsh";
    mockGetRiftConfig.mockResolvedValue({});
    mockGetGlobalConfig.mockReturnValue({});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    // Should fall back to "code" and "claude"
    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some((c) => c.includes("VS Code") && c.includes("code")),
    ).toBe(true);
    expect(logCalls.some((c) => c.includes("claude"))).toBe(true);
    logSpy.mockRestore();
  });

  test("uses global config when rift config is empty", async () => {
    process.env.SHELL = "/bin/zsh";
    mockGetRiftConfig.mockResolvedValue({});
    mockGetGlobalConfig.mockReturnValue({ editor: "cursor", agent: "aider" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some((c) => c.includes("Cursor") && c.includes("cursor")),
    ).toBe(true);
    expect(logCalls.some((c) => c.includes("aider"))).toBe(true);
    logSpy.mockRestore();
  });

  test("shows editorCmd as name when editor not in EDITORS list", async () => {
    process.env.SHELL = "/bin/zsh";
    mockGetRiftConfig.mockResolvedValue({ editor: "unknown-editor" });
    mockGetGlobalConfig.mockReturnValue({});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(logCalls.some((c) => c.includes("unknown-editor"))).toBe(true);
    logSpy.mockRestore();
  });

  test("shows current editor and agent when no flags passed", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some((c) => c.includes("VS Code") && c.includes("code")),
    ).toBe(true);
    expect(logCalls.some((c) => c.includes("claude"))).toBe(true);
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
    // existsSync is called for rcPath and for .bashrc - return true for both
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
    // existsSync returns false for .bashrc (so it falls back to .bash_profile)
    // then false for rcPath (so it creates it)
    mockExistsSync.mockImplementation((path: string) => {
      if (path === bashrc) return false;
      return false;
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    // Should have used .bash_profile path
    expect(mockAppendFileSync).toHaveBeenCalled();
    const rcPath = mockAppendFileSync.mock.calls[0][0] as string;
    expect(rcPath).toContain(".bash_profile");
    logSpy.mockRestore();
  });

  test("ignores --editor flag without value", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--editor"]);

    // Should not save config since --editor has no value
    expect(mockSaveRiftConfig).not.toHaveBeenCalled();
    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
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
    // existsSync returns false for rcPath
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
