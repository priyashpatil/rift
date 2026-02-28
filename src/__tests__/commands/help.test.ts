import { describe, expect, test, vi } from "vitest";
import { cmdHelp, showCommandHelp } from "../../commands/help";
import { cmdVersion } from "../../commands/version";

describe("cmdHelp", () => {
  test("prints help text containing usage info", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    cmdHelp();
    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("Rift");
    expect(output).toContain("Usage:");
    expect(output).toContain("Commands:");
    expect(output).toContain("status");
    expect(output).toContain("open");
    expect(output).toContain("list");
    expect(output).toContain("close");
    expect(output).toContain("jump");
    expect(output).toContain("code");
    expect(output).toContain("purge");
    expect(output).toContain("config");
    expect(output).toContain("init");
    expect(output).toContain("Options:");
    expect(output).toContain("--base");
    expect(output).toContain("--skip-agent");
    expect(output).toContain("--force");
    spy.mockRestore();
  });
});

describe("showCommandHelp", () => {
  test("shows help for a known command", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    showCommandHelp("open");
    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("Usage: rift open");
    spy.mockRestore();
  });

  test("resolves alias and shows help", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    showCommandHelp("ls");
    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("Usage: rift list");
    spy.mockRestore();
  });

  test("falls back to cmdHelp for unknown command", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    showCommandHelp("nonexistent");
    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("Usage: rift <command>");
    spy.mockRestore();
  });
});

describe("cmdVersion", () => {
  test("prints the package version", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    cmdVersion();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatch(/^\d+\.\d+\.\d+/);
    spy.mockRestore();
  });
});
