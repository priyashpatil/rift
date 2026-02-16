import { describe, expect, test, spyOn, beforeEach, afterEach } from "bun:test";
import { cmdShellInit } from "../../commands/shell-init";

describe("cmdShellInit", () => {
  const originalShell = process.env.SHELL;

  afterEach(() => {
    process.env.SHELL = originalShell;
  });

  function getInitOutput(): string {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    cmdShellInit();
    // Find the log call that contains shell wrapper content
    const output = logSpy.mock.calls
      .map((c) => String(c[0] ?? ""))
      .find((s) => s.includes("rift") && (s.includes("function") || s.includes("()")))!;
    logSpy.mockRestore();
    return output;
  }

  test("outputs posix wrapper for zsh", () => {
    process.env.SHELL = "/bin/zsh";
    const output = getInitOutput();
    expect(output).toContain("function rift");
    expect(output).toContain("command rift");
    expect(output).toContain(".rift_cd_path");
    expect(output).toContain(".rift_start_agent");
    expect(output).toContain("_agent-cmd");
  });

  test("outputs posix wrapper for bash", () => {
    process.env.SHELL = "/bin/bash";
    const output = getInitOutput();
    expect(output).toContain("function rift");
    expect(output).toContain("command rift");
  });

  test("outputs fish wrapper for fish shell", () => {
    process.env.SHELL = "/usr/local/bin/fish";
    const output = getInitOutput();
    expect(output).toContain("function rift");
    expect(output).toContain("command rift $argv");
    expect(output).toContain("set rc $status");
    expect(output).toContain("end");
  });

  test("defaults to zsh for unknown shell", () => {
    process.env.SHELL = "/bin/unknownshell";
    const output = getInitOutput();
    expect(output).toContain("function rift");
  });

  test("defaults to zsh when SHELL is empty", () => {
    process.env.SHELL = "";
    const output = getInitOutput();
    expect(output).toContain("function rift");
  });
});
