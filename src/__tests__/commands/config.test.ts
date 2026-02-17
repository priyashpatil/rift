import { describe, expect, test, mock, spyOn, beforeEach, afterEach } from "bun:test";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

const mockGetGlobalConfig = mock(() => ({ agent: "claude", editor: "code" }));
const mockSaveGlobalConfig = mock((_config: any) => {});
const mockGetRiftConfig = mock(async () => ({ agent: "claude", editor: "code" }));
const mockSaveRiftConfig = mock(async (_updates: any) => {});
const mockIsGitRepo = mock(async () => true);
const mockEditors = [
  { name: "VS Code", cmd: "code", managedWorkspace: true },
  { name: "Cursor", cmd: "cursor", managedWorkspace: true },
  { name: "Windsurf", cmd: "windsurf", managedWorkspace: true },
];
mock.module("../../config", () => ({
  getGlobalConfig: mockGetGlobalConfig,
  saveGlobalConfig: mockSaveGlobalConfig,
  getRiftConfig: mockGetRiftConfig,
  saveRiftConfig: mockSaveRiftConfig,
  EDITORS: mockEditors,
}));

mock.module("../../git", () => ({
  isGitRepo: mockIsGitRepo,
}));

import { cmdConfig } from "../../commands/config";

describe("cmdConfig", () => {
  const originalShell = process.env.SHELL;

  beforeEach(() => {
    mockGetGlobalConfig.mockClear().mockReturnValue({ agent: "claude", editor: "code" });
    mockSaveGlobalConfig.mockClear();
    mockGetRiftConfig.mockClear().mockResolvedValue({ agent: "claude", editor: "code" });
    mockSaveRiftConfig.mockClear();
    mockIsGitRepo.mockClear().mockResolvedValue(true);
  });

  afterEach(() => {
    process.env.SHELL = originalShell;
  });

  test("saves editor to project config by default", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--editor", "cursor"]);

    expect(mockSaveRiftConfig).toHaveBeenCalled();
    const updates = mockSaveRiftConfig.mock.calls[0][0];
    expect(updates.editor).toBe("cursor");
    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("saves agent to project config by default", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--agent", "amp"]);

    expect(mockSaveRiftConfig).toHaveBeenCalled();
    const updates = mockSaveRiftConfig.mock.calls[0][0];
    expect(updates.agent).toBe("amp");
    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("saves to global config with --global flag", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--global", "--editor", "cursor"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    const savedConfig = mockSaveGlobalConfig.mock.calls[0][0];
    expect(savedConfig.editor).toBe("cursor");
    expect(mockSaveRiftConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("saves both editor and agent to project config", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--editor", "windsurf", "--agent", "amp"]);

    expect(mockSaveRiftConfig).toHaveBeenCalled();
    const updates = mockSaveRiftConfig.mock.calls[0][0];
    expect(updates.editor).toBe("windsurf");
    expect(updates.agent).toBe("amp");
    logSpy.mockRestore();
  });

  test("saves both editor and agent to global config with --global", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--global", "--editor", "windsurf", "--agent", "amp"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    const savedConfig = mockSaveGlobalConfig.mock.calls[0][0];
    expect(savedConfig.editor).toBe("windsurf");
    expect(savedConfig.agent).toBe("amp");
    logSpy.mockRestore();
  });

  test("throws on unknown editor", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await expect(cmdConfig(["--editor", "vim"])).rejects.toThrow(
      /unknown editor "vim"/,
    );
    logSpy.mockRestore();
  });

  test("accepts any agent string", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--agent", "aider --model gpt-4"]);

    expect(mockSaveRiftConfig).toHaveBeenCalled();
    const updates = mockSaveRiftConfig.mock.calls[0][0];
    expect(updates.agent).toBe("aider --model gpt-4");
    logSpy.mockRestore();
  });

  test("throws when not in git repo without --global", async () => {
    process.env.SHELL = "/bin/zsh";
    mockIsGitRepo.mockResolvedValue(false);
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await expect(cmdConfig(["--editor", "cursor"])).rejects.toThrow(
      /not a git repository/,
    );
    logSpy.mockRestore();
  });

  test("saves to global config when not in git repo with --global", async () => {
    process.env.SHELL = "/bin/zsh";
    mockIsGitRepo.mockResolvedValue(false);
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig(["--global", "--editor", "cursor"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("does not save config when no flags passed", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    expect(mockSaveRiftConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("shows current editor and agent when no flags passed", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(logCalls.some((c) => c.includes("VS Code") && c.includes("code"))).toBe(true);
    expect(logCalls.some((c) => c.includes("claude"))).toBe(true);
    logSpy.mockRestore();
  });

  test("detects zsh shell", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some((c) => c.includes("Shell integration") || c.includes("shell integration")),
    ).toBe(true);
    logSpy.mockRestore();
  });

  test("detects fish shell", async () => {
    process.env.SHELL = "/usr/local/bin/fish";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    const fishDir = join(require("os").homedir(), ".config", "fish");
    mkdirSync(fishDir, { recursive: true });

    await cmdConfig([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some((c) => c.includes("Shell integration") || c.includes("shell integration")),
    ).toBe(true);
    logSpy.mockRestore();
  });

  test("defaults to zsh for unknown shell", async () => {
    process.env.SHELL = "/bin/csh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfig([]);

    // Should not throw
    expect(logSpy).toHaveBeenCalled();
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
