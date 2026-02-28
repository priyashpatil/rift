import { describe, expect, test } from "bun:test";
import { compareVersions } from "../update-check";

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
});
