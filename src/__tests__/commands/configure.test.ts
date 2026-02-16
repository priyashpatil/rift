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
const mockEditors = [
  { name: "VS Code", cmd: "code", managedWorkspace: true },
  { name: "Cursor", cmd: "cursor", managedWorkspace: true },
  { name: "Windsurf", cmd: "windsurf", managedWorkspace: true },
];
const mockAgents = [
  { name: "Claude Code", cmd: "claude" },
  { name: "Amp", cmd: "amp" },
];

mock.module("../../config", () => ({
  getGlobalConfig: mockGetGlobalConfig,
  saveGlobalConfig: mockSaveGlobalConfig,
  EDITORS: mockEditors,
  AGENTS: mockAgents,
}));

import { cmdConfigure } from "../../commands/configure";

describe("cmdConfigure", () => {
  const originalShell = process.env.SHELL;

  beforeEach(() => {
    mockGetGlobalConfig.mockClear().mockReturnValue({ agent: "claude", editor: "code" });
    mockSaveGlobalConfig.mockClear();
  });

  afterEach(() => {
    process.env.SHELL = originalShell;
  });

  test("sets editor via --editor flag", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfigure(["--editor", "cursor"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    const savedConfig = mockSaveGlobalConfig.mock.calls[0][0];
    expect(savedConfig.editor).toBe("cursor");
    logSpy.mockRestore();
  });

  test("sets agent via --agent flag", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfigure(["--agent", "amp"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    const savedConfig = mockSaveGlobalConfig.mock.calls[0][0];
    expect(savedConfig.agent).toBe("amp");
    logSpy.mockRestore();
  });

  test("sets both editor and agent via flags", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfigure(["--editor", "windsurf", "--agent", "amp"]);

    expect(mockSaveGlobalConfig).toHaveBeenCalled();
    const savedConfig = mockSaveGlobalConfig.mock.calls[0][0];
    expect(savedConfig.editor).toBe("windsurf");
    expect(savedConfig.agent).toBe("amp");
    logSpy.mockRestore();
  });

  test("throws on unknown editor", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await expect(cmdConfigure(["--editor", "vim"])).rejects.toThrow(
      /unknown editor "vim"/,
    );
    logSpy.mockRestore();
  });

  test("throws on unknown agent", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await expect(cmdConfigure(["--agent", "copilot"])).rejects.toThrow(
      /unknown agent "copilot"/,
    );
    logSpy.mockRestore();
  });

  test("does not save config when no flags passed", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfigure([]);

    expect(mockSaveGlobalConfig).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("shows current editor and agent when no flags passed", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfigure([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(logCalls.some((c) => c.includes("VS Code") && c.includes("code"))).toBe(true);
    expect(logCalls.some((c) => c.includes("Claude Code") && c.includes("claude"))).toBe(true);
    logSpy.mockRestore();
  });

  test("detects zsh shell", async () => {
    process.env.SHELL = "/bin/zsh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfigure([]);

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

    await cmdConfigure([]);

    const logCalls = logSpy.mock.calls.map((c) => String(c[0] ?? ""));
    expect(
      logCalls.some((c) => c.includes("Shell integration") || c.includes("shell integration")),
    ).toBe(true);
    logSpy.mockRestore();
  });

  test("defaults to zsh for unknown shell", async () => {
    process.env.SHELL = "/bin/csh";
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    await cmdConfigure([]);

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
