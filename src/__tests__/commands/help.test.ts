import { describe, expect, test, spyOn } from "bun:test";
import { cmdHelp } from "../../commands/help";

describe("cmdHelp", () => {
  test("prints help text containing usage info", () => {
    const spy = spyOn(console, "log").mockImplementation(() => {});
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
