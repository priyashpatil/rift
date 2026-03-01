import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const { mockClearUpdateCache } = vi.hoisted(() => ({
  mockClearUpdateCache: vi.fn(),
}));

const { mockWriteFileSync, mockChmodSync, mockUnlinkSync, mockRenameSync } =
  vi.hoisted(() => ({
    mockWriteFileSync: vi.fn(),
    mockChmodSync: vi.fn(),
    mockUnlinkSync: vi.fn(),
    mockRenameSync: vi.fn(),
  }));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    writeFileSync: mockWriteFileSync,
    chmodSync: mockChmodSync,
    unlinkSync: mockUnlinkSync,
    renameSync: mockRenameSync,
  };
});

vi.mock("../../update-check", () => ({
  clearUpdateCache: mockClearUpdateCache,
}));

import { cmdUpdate, didUpdate } from "../../commands/update";

describe("cmdUpdate", () => {
  const originalFetch = globalThis.fetch;
  const originalExit = process.exit;

  beforeEach(() => {
    mockClearUpdateCache.mockClear();
    mockWriteFileSync.mockClear();
    mockChmodSync.mockClear();
    mockUnlinkSync.mockClear();
    mockRenameSync.mockClear();
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
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  test("downloads binary and clears cache on successful update", async () => {
    const calls: string[] = [];
    globalThis.fetch = vi.fn((url: string) => {
      calls.push(url);
      if (url.includes("registry.npmjs.org")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        });
      }
      // GitHub release download
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
    }) as any;

    await cmdUpdate();

    expect(mockWriteFileSync).toHaveBeenCalled();
    expect(mockClearUpdateCache).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("\nUpdated to 99.0.0!");
    expect(didUpdate).toBe(true);
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

  test("exits on download failure", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        });
      }
      // Download fails
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    }) as any;

    await cmdUpdate();

    expect(process.exit).toHaveBeenCalledWith(1);
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

  test("exits on unsupported platform", async () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(
      process,
      "platform",
    );
    const originalArch = Object.getOwnPropertyDescriptor(process, "arch");

    Object.defineProperty(process, "platform", { value: "freebsd" });
    Object.defineProperty(process, "arch", { value: "s390x" });

    let callCount = 0;
    globalThis.fetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        });
      }
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
    }) as any;

    await cmdUpdate();

    expect(console.error).toHaveBeenCalledWith(
      "Unsupported platform: freebsd-s390x",
    );
    expect(process.exit).toHaveBeenCalledWith(1);

    if (originalPlatform)
      Object.defineProperty(process, "platform", originalPlatform);
    if (originalArch) Object.defineProperty(process, "arch", originalArch);
  });

  test("exits when binary cannot be replaced via unlink or rename", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        });
      }
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
    }) as any;

    // unlinkSync fails (can't delete running binary)
    const { unlinkSync } = await import("fs");
    const mockUnlink = vi.mocked(unlinkSync);
    mockUnlink.mockImplementation(() => {
      throw new Error("EBUSY");
    });

    // renameSync also fails
    mockRenameSync.mockImplementation(() => {
      throw new Error("EPERM");
    });

    await cmdUpdate();

    expect(console.error).toHaveBeenCalledWith(
      "\nUpdate failed: could not replace binary.",
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test("shows updating message with version range", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        });
      }
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
    }) as any;

    await cmdUpdate();

    const pkg = await import("../../../package.json");
    expect(console.log).toHaveBeenCalledWith(
      `Updating ${pkg.version} → 99.0.0...\n`,
    );
  });
});
