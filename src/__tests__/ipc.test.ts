import { describe, expect, test, afterEach } from "vitest";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { writeCdPath, signalAgentStart } from "../ipc";
import { CD_PATH_FILE, AGENT_START_FILE } from "../constants";

describe("ipc", () => {
  afterEach(() => {
    try { unlinkSync(CD_PATH_FILE); } catch {}
    try { unlinkSync(AGENT_START_FILE); } catch {}
  });

  describe("writeCdPath", () => {
    test("writes the path to CD_PATH_FILE", () => {
      writeCdPath("/some/path");
      expect(existsSync(CD_PATH_FILE)).toBe(true);
      expect(readFileSync(CD_PATH_FILE, "utf-8")).toBe("/some/path");
    });

    test("overwrites previous content", () => {
      writeCdPath("/first");
      writeCdPath("/second");
      expect(readFileSync(CD_PATH_FILE, "utf-8")).toBe("/second");
    });
  });

  describe("signalAgentStart", () => {
    test("creates the AGENT_START_FILE", () => {
      signalAgentStart();
      expect(existsSync(AGENT_START_FILE)).toBe(true);
    });

    test("file content is empty string", () => {
      signalAgentStart();
      expect(readFileSync(AGENT_START_FILE, "utf-8")).toBe("");
    });
  });
});
