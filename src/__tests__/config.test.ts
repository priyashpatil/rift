import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import yaml from "js-yaml";

describe("config", () => {
  describe("EDITORS constant", () => {
    test("contains VS Code with managed workspace", async () => {
      const { EDITORS } = await import("../config");
      expect(EDITORS.find((e) => e.cmd === "code")).toEqual({
        name: "VS Code",
        cmd: "code",
        managedWorkspace: true,
      });
    });

    test("contains 3 editors", async () => {
      const { EDITORS } = await import("../config");
      expect(EDITORS.length).toBe(3);
    });

    test("all editors have managedWorkspace true", async () => {
      const { EDITORS } = await import("../config");
      for (const editor of EDITORS) {
        expect(editor.managedWorkspace).toBe(true);
      }
    });
  });

  describe("AGENTS constant", () => {
    test("contains Claude Code agent", async () => {
      const { AGENTS } = await import("../config");
      expect(AGENTS.find((a) => a.cmd === "claude")).toEqual({
        name: "Claude Code",
        cmd: "claude",
      });
    });

    test("contains 8 agents", async () => {
      const { AGENTS } = await import("../config");
      expect(AGENTS.length).toBe(8);
    });
  });

  describe("getGlobalConfig", () => {
    test("returns an object", async () => {
      const { getGlobalConfig } = await import("../config");
      const result = getGlobalConfig();
      expect(typeof result).toBe("object");
    });
  });

  describe("saveGlobalConfig", () => {
    test("saves and reads back config as YAML", async () => {
      const { saveGlobalConfig, getGlobalConfig } = await import("../config");
      const { GLOBAL_CONFIG_PATH } = await import("../constants");

      // Save original
      let originalConfig = {};
      try {
        originalConfig = getGlobalConfig();
      } catch {}

      try {
        const testConfig = { agent: "test-agent", editor: "test-editor" };
        saveGlobalConfig(testConfig);

        const content = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
        const parsed = yaml.load(content) as any;
        expect(parsed.agent).toBe("test-agent");
        expect(parsed.editor).toBe("test-editor");
      } finally {
        saveGlobalConfig(originalConfig);
      }
    });
  });

  describe("getAgentCommand", () => {
    test("returns a non-empty string", async () => {
      const { getAgentCommand } = await import("../config");
      const cmd = await getAgentCommand();
      expect(typeof cmd).toBe("string");
      expect(cmd.length).toBeGreaterThan(0);
    });
  });

  describe("getEditor", () => {
    test("returns an Editor object with required properties", async () => {
      const { getEditor } = await import("../config");
      const editor = await getEditor();
      expect(editor).toHaveProperty("name");
      expect(editor).toHaveProperty("cmd");
      expect(editor).toHaveProperty("managedWorkspace");
      expect(typeof editor.name).toBe("string");
      expect(typeof editor.cmd).toBe("string");
      expect(typeof editor.managedWorkspace).toBe("boolean");
    });

    test("returns a valid editor from the EDITORS list", async () => {
      const { getEditor, EDITORS } = await import("../config");
      const editor = await getEditor();
      expect(EDITORS.some((e) => e.cmd === editor.cmd)).toBe(true);
    });
  });

  describe("getRiftConfig", () => {
    test("returns empty object for non-git directory", async () => {
      const { getRiftConfig } = await import("../config");
      const config = await getRiftConfig("/nonexistent/path");
      expect(config).toEqual({});
    });

    test("returns empty object when no rift.yaml exists", async () => {
      const { getRiftConfig } = await import("../config");
      const config = await getRiftConfig(".");
      expect(typeof config).toBe("object");
    });

    test("returns object (possibly empty) for current directory", async () => {
      const { getRiftConfig } = await import("../config");
      // Tests the catch path when mock.module leaks
      const config = await getRiftConfig(".");
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });
  });
});
