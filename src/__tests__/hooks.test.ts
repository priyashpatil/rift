import { describe, expect, test, mock, spyOn, beforeEach, afterAll } from "bun:test";
import { runHook } from "../hooks";

// Mock getRiftConfig
const mockGetRiftConfig = mock(() => Promise.resolve({}));
mock.module("../config", () => ({
  getRiftConfig: mockGetRiftConfig,
}));

describe("runHook", () => {
  beforeEach(() => {
    mockGetRiftConfig.mockReset().mockResolvedValue({});
  });

  afterAll(() => {
    mockGetRiftConfig.mockReset().mockResolvedValue({});
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

  test("warns when hook exits with non-zero code", async () => {
    mockGetRiftConfig.mockResolvedValue({
      hooks: { open: "exit 1" },
    });
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    await runHook("open", "/tmp");

    expect(errorSpy).toHaveBeenCalledWith(
      "Warning: open hook exited with code 1",
    );
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("does not warn when hook exits with zero", async () => {
    mockGetRiftConfig.mockResolvedValue({
      hooks: { open: "true" },
    });
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    await runHook("open", "/tmp");

    expect(errorSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
