import { describe, expect, test, mock, spyOn, beforeEach } from "bun:test";
import { runHook } from "../hooks";

// Mock getRiftConfig
const mockGetRiftConfig = mock(() => Promise.resolve({}));
mock.module("../config", () => ({
  getRiftConfig: mockGetRiftConfig,
}));

describe("runHook", () => {
  beforeEach(() => {
    mockGetRiftConfig.mockClear();
  });

  test("does nothing when no hook is configured", async () => {
    mockGetRiftConfig.mockResolvedValue({});
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    await runHook("open", "/some/dir");

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("does nothing when hooks object exists but specific hook is missing", async () => {
    mockGetRiftConfig.mockResolvedValue({ hooks: { close: "echo done" } });
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    await runHook("open", "/some/dir");

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("runs script when hook is configured", async () => {
    mockGetRiftConfig.mockResolvedValue({
      hooks: { open: "echo hello" },
    });
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    await runHook("open", "/tmp");

    expect(consoleSpy).toHaveBeenCalledWith("Running open hook...");
    consoleSpy.mockRestore();
  });

  test("calls getRiftConfig with the run directory", async () => {
    mockGetRiftConfig.mockResolvedValue({});

    await runHook("jump", "/test/dir");

    expect(mockGetRiftConfig).toHaveBeenCalledWith("/test/dir");
  });
});
