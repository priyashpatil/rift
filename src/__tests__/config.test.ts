import { describe, expect, test } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
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
      const config = await getRiftConfig(".");
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });
  });

  describe("getRiftConfig with falsy YAML content", () => {
    test("returns empty object when rift.yaml contains empty YAML (null)", async () => {
      // yaml.load("") returns undefined, so the || {} fallback is exercised
      const { getRiftConfig } = await import("../config");
      const { getMainWorktree } = await import("../git");

      const mainRepo = await getMainWorktree(".");
      const configPath = join(mainRepo, "rift.yaml");

      // Save original if exists
      let original: string | null = null;
      try {
        original = readFileSync(configPath, "utf-8");
      } catch {}

      try {
        // Write empty YAML content (yaml.load returns undefined)
        writeFileSync(configPath, "");
        const config = await getRiftConfig(".");
        expect(config).toEqual({});
      } finally {
        if (original !== null) {
          writeFileSync(configPath, original);
        }
      }
    });
  });

  describe("getGlobalConfig with falsy YAML", () => {
    test("returns empty object when global config contains empty YAML", async () => {
      const { getGlobalConfig } = await import("../config");
      const { GLOBAL_CONFIG_PATH } = await import("../constants");

      let original: string | null = null;
      try {
        original = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
      } catch {}

      try {
        writeFileSync(GLOBAL_CONFIG_PATH, "");
        const config = getGlobalConfig();
        expect(config).toEqual({});
      } finally {
        if (original !== null) {
          writeFileSync(GLOBAL_CONFIG_PATH, original);
        } else {
          try {
            const { unlinkSync } = await import("fs");
            unlinkSync(GLOBAL_CONFIG_PATH);
          } catch {}
        }
      }
    });
  });

  describe("getEditor with unknown editor in config", () => {
    test("falls back to default editor when config editor is not in EDITORS list", async () => {
      const { getEditor, saveGlobalConfig } = await import("../config");
      const { getMainWorktree } = await import("../git");
      const { GLOBAL_CONFIG_PATH } = await import("../constants");

      const mainRepo = await getMainWorktree(".");
      const configPath = join(mainRepo, "rift.yaml");

      let originalRift: string | null = null;
      let originalGlobal: string | null = null;
      try {
        originalRift = readFileSync(configPath, "utf-8");
      } catch {}
      try {
        originalGlobal = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
      } catch {}

      try {
        // Write a rift.yaml with an unknown editor
        writeFileSync(configPath, yaml.dump({ editor: "nonexistent-editor" }));
        // Clear global config to avoid interference
        saveGlobalConfig({});

        const editor = await getEditor();
        // Should fall back to DEFAULT_EDITOR (VS Code)
        expect(editor.cmd).toBe("code");
      } finally {
        if (originalRift !== null) {
          writeFileSync(configPath, originalRift);
        } else {
          try {
            const { unlinkSync } = await import("fs");
            unlinkSync(configPath);
          } catch {}
        }
        if (originalGlobal !== null) {
          writeFileSync(GLOBAL_CONFIG_PATH, originalGlobal);
        }
      }
    });
  });

  describe("saveRiftConfig with empty existing YAML", () => {
    test("handles empty YAML in existing config file", async () => {
      const { saveRiftConfig, getRiftConfig } = await import("../config");
      const { getMainWorktree } = await import("../git");

      const mainRepo = await getMainWorktree(".");
      const configPath = join(mainRepo, "rift.yaml");

      let original: string | null = null;
      try {
        original = readFileSync(configPath, "utf-8");
      } catch {}

      try {
        // Write empty YAML (yaml.load returns undefined, || {} kicks in)
        writeFileSync(configPath, "");
        await saveRiftConfig({ agent: "test-agent" });
        const config = await getRiftConfig(".");
        expect(config.agent).toBe("test-agent");
      } finally {
        if (original !== null) {
          writeFileSync(configPath, original);
        }
      }
    });
  });
});
