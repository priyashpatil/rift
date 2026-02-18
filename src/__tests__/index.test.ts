import { describe, expect, test } from "bun:test";

// The index.ts module is the CLI entry point that reads process.argv and
// dispatches commands. It's tested indirectly through the command tests.
// We verify the module structure here.

describe("index module", () => {
  test("all command modules are importable", async () => {
    const modules = [
      import("../commands/help"),
      import("../commands/status"),
      import("../commands/open"),
      import("../commands/list"),
      import("../commands/close"),
      import("../commands/jump"),
      import("../commands/code"),
      import("../commands/purge"),
      import("../commands/init"),
      import("../commands/config"),
      import("../commands/run-agent"),
    ];
    const results = await Promise.all(modules);
    expect(results[0].cmdHelp).toBeDefined();
    expect(results[1].cmdStatus).toBeDefined();
    expect(results[2].cmdOpen).toBeDefined();
    expect(results[3].cmdList).toBeDefined();
    expect(results[4].cmdClose).toBeDefined();
    expect(results[5].cmdJump).toBeDefined();
    expect(results[6].cmdCode).toBeDefined();
    expect(results[7].cmdPurge).toBeDefined();
    expect(results[8].cmdInit).toBeDefined();
    expect(results[9].cmdConfig).toBeDefined();
    expect(results[10].cmdRunAgent).toBeDefined();
  });

  test("getAgentCommand is importable from config", async () => {
    const { getAgentCommand } = await import("../config");
    expect(typeof getAgentCommand).toBe("function");
  });
});
