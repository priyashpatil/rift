import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const { mockExecFileSync } = vi.hoisted(() => ({
  mockExecFileSync: vi.fn(),
}));

const { mockClearUpdateCache } = vi.hoisted(() => ({
  mockClearUpdateCache: vi.fn(),
}));

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return { ...actual, execFileSync: mockExecFileSync };
});

vi.mock("../../update-check", () => ({
  clearUpdateCache: mockClearUpdateCache,
}));

import { cmdUpdate } from "../../commands/update";

describe("cmdUpdate", () => {
  const originalFetch = globalThis.fetch;
  const originalExit = process.exit;

  beforeEach(() => {
    mockExecFileSync.mockClear();
    mockClearUpdateCache.mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.exit = originalExit;
    vi.restoreAllMocks();
  });

  test("prints already up to date when versions match", async () => {
    const pkg = await import("../../../package.json");
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: pkg.version }),
      }),
    ) as any;

    await cmdUpdate();

    expect(console.log).toHaveBeenCalledWith("Already up to date!");
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  test("runs npm install and clears cache on successful update", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: "99.0.0" }),
      }),
    ) as any;

    await cmdUpdate();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      "npm",
      ["install", "-g", expect.stringContaining("@latest")],
      { stdio: "inherit" },
    );
    expect(mockClearUpdateCache).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("\nUpdated to 99.0.0!");
  });

  test("exits on fetch failure", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error("network error")),
    ) as any;

    await cmdUpdate();

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to check for updates. Check your internet connection.",
    );
  });

  test("exits on non-ok response", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as any;

    await cmdUpdate();

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test("exits on npm install failure", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: "99.0.0" }),
      }),
    ) as any;
    mockExecFileSync.mockImplementation(() => {
      throw new Error("npm error");
    });

    await cmdUpdate();

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      "\nUpdate failed. Try running manually:",
    );
  });

  test("shows current version and checking message", async () => {
    const pkg = await import("../../../package.json");
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: pkg.version }),
      }),
    ) as any;

    await cmdUpdate();

    expect(console.log).toHaveBeenCalledWith(`Current version: ${pkg.version}`);
    expect(console.log).toHaveBeenCalledWith("Checking for updates...\n");
  });

  test("shows updating message with version range", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: "99.0.0" }),
      }),
    ) as any;

    await cmdUpdate();

    const pkg = await import("../../../package.json");
    expect(console.log).toHaveBeenCalledWith(
      `Updating ${pkg.version} → 99.0.0...\n`,
    );
  });
});
