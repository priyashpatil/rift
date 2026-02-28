import { describe, expect, test, vi, beforeEach, afterAll } from "vitest";

const { mockGetRiftConfig } = vi.hoisted(() => ({
  mockGetRiftConfig: vi.fn(() => Promise.resolve({})),
}));

vi.mock("../config", () => ({
  getRiftConfig: mockGetRiftConfig,
}));

import { runHook } from "../hooks";

describe("runHook", () => {
  beforeEach(() => {
    mockGetRiftConfig.mockReset().mockResolvedValue({});
  });

  afterAll(() => {
    mockGetRiftConfig.mockReset().mockResolvedValue({});
  });

  test("does nothing when no hook is configured", async () => {
    mockGetRiftConfig.mockResolvedValue({});
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runHook("open", "/some/dir");

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("does nothing when hooks object exists but specific hook is missing", async () => {
    mockGetRiftConfig.mockResolvedValue({ hooks: { close: "echo done" } });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runHook("open", "/some/dir");

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("runs script when hook is configured", async () => {
    mockGetRiftConfig.mockResolvedValue({
      hooks: { open: "echo hello" },
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

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
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await runHook("open", "/tmp");

    expect(errorSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
