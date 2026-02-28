import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { compareVersions, checkForUpdates, clearUpdateCache } from "../update-check";

const {
  mockReadFileSync,
  mockWriteFileSync,
  mockMkdirSync,
  mockUnlinkSync,
} = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(() => "{}"),
  mockWriteFileSync: vi.fn(() => {}),
  mockMkdirSync: vi.fn(() => undefined as any),
  mockUnlinkSync: vi.fn(() => {}),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    unlinkSync: mockUnlinkSync,
  };
});

describe("update-check", () => {
  describe("compareVersions", () => {
    test("returns -1 when current is older", () => {
      expect(compareVersions("0.1.0", "0.2.0")).toBe(-1);
      expect(compareVersions("0.1.0", "0.1.1")).toBe(-1);
      expect(compareVersions("0.1.0", "1.0.0")).toBe(-1);
    });

    test("returns 0 when versions are equal", () => {
      expect(compareVersions("0.1.1", "0.1.1")).toBe(0);
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    });

    test("returns 1 when current is newer", () => {
      expect(compareVersions("0.2.0", "0.1.0")).toBe(1);
      expect(compareVersions("1.0.0", "0.9.9")).toBe(1);
      expect(compareVersions("0.1.2", "0.1.1")).toBe(1);
    });
  });

  describe("checkForUpdates", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      mockReadFileSync.mockClear();
      mockWriteFileSync.mockClear();
      mockMkdirSync.mockClear();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test("uses cached version when cache is fresh", async () => {
      const cache = JSON.stringify({
        lastCheck: Date.now(),
        latestVersion: "0.0.1",
      });
      mockReadFileSync.mockReturnValue(cache);
      globalThis.fetch = vi.fn(() => Promise.reject(new Error("should not fetch"))) as any;

      await checkForUpdates();
      // Should not have fetched since cache is fresh
    });

    test("fetches from npm when cache is expired", async () => {
      const cache = JSON.stringify({
        lastCheck: 0, // expired
        latestVersion: "0.0.1",
      });
      mockReadFileSync.mockReturnValue(cache);
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        }),
      ) as any;

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await checkForUpdates();

      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      const msg = errorSpy.mock.calls[0][0] as string;
      expect(msg).toContain("Update available");
      expect(msg).toContain("99.0.0");
      errorSpy.mockRestore();
    });

    test("fetches when cache file doesn't exist", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        }),
      ) as any;

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await checkForUpdates();
      expect(mockWriteFileSync).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    test("handles fetch failure silently", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      globalThis.fetch = vi.fn(() => Promise.reject(new Error("network"))) as any;

      // Should not throw
      await checkForUpdates();
    });

    test("handles non-ok response", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({ ok: false }),
      ) as any;

      await checkForUpdates();
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test("no notification when current version is up to date", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "0.0.0" }),
        }),
      ) as any;

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await checkForUpdates();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    test("handles writeCache error silently", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      mockMkdirSync.mockImplementation(() => {
        throw new Error("EACCES");
      });
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        }),
      ) as any;

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await checkForUpdates();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    test("update message suggests rift update", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        }),
      ) as any;

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await checkForUpdates();
      const msg = errorSpy.mock.calls[0][0] as string;
      expect(msg).toContain("rift update");
      errorSpy.mockRestore();
    });
  });

  describe("clearUpdateCache", () => {
    beforeEach(() => {
      mockUnlinkSync.mockClear();
    });

    test("deletes the cache file", () => {
      clearUpdateCache();
      expect(mockUnlinkSync).toHaveBeenCalledOnce();
    });

    test("ignores error if cache file doesn't exist", () => {
      mockUnlinkSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      // Should not throw
      clearUpdateCache();
    });
  });
});
