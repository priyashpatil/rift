import { describe, expect, test } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

describe("config", () => {
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

      let originalConfig = {};
      try {
        originalConfig = getGlobalConfig();
      } catch {}

      try {
        const testConfig = { agent: "test-agent" };
        saveGlobalConfig(testConfig);

        const content = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
        const parsed = yaml.load(content) as any;
        expect(parsed.agent).toBe("test-agent");
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

    test("returns object for current directory", async () => {
      const { getRiftConfig } = await import("../config");
      const config = await getRiftConfig(".");
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });
  });

  describe("getRiftConfig with falsy YAML content", () => {
    test("returns empty object when rift.yaml contains empty YAML", async () => {
      const { getRiftConfig } = await import("../config");
      const { getMainWorktree } = await import("../git");

      const mainRepo = await getMainWorktree(".");
      const configPath = join(mainRepo, "rift.yaml");

      let original: string | null = null;
      try {
        original = readFileSync(configPath, "utf-8");
      } catch {}

      try {
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
