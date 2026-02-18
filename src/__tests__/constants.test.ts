import { describe, expect, test } from "bun:test";
import {
  RIFT_DIR,
  WORKTREES_DIR,
  WORKSPACES_DIR,
  CONFIG_DIR,
  GLOBAL_CONFIG_PATH,
  CD_PATH_FILE,
  AGENT_START_FILE,
  ADJECTIVES,
  NOUNS,
} from "../constants";

describe("constants", () => {
  test("WORKTREES_DIR is under RIFT_DIR", () => {
    expect(WORKTREES_DIR).toBe(`${RIFT_DIR}/worktrees`);
  });

  test("WORKSPACES_DIR is under RIFT_DIR", () => {
    expect(WORKSPACES_DIR).toBe(`${RIFT_DIR}/workspaces`);
  });

  test("GLOBAL_CONFIG_PATH is config.yaml in CONFIG_DIR", () => {
    expect(GLOBAL_CONFIG_PATH).toBe(`${CONFIG_DIR}/config.yaml`);
  });

  test("CD_PATH_FILE contains .rift_cd_path", () => {
    expect(CD_PATH_FILE).toMatch(/\.rift_cd_path/);
  });

  test("AGENT_START_FILE contains .rift_start_agent", () => {
    expect(AGENT_START_FILE).toMatch(/\.rift_start_agent/);
  });

  test("RIFT_DIR is a string path", () => {
    expect(typeof RIFT_DIR).toBe("string");
    expect(RIFT_DIR.length).toBeGreaterThan(0);
  });

  test("CONFIG_DIR is a string path", () => {
    expect(typeof CONFIG_DIR).toBe("string");
    expect(CONFIG_DIR.length).toBeGreaterThan(0);
  });

  test("ADJECTIVES is a non-empty array of strings", () => {
    expect(ADJECTIVES.length).toBeGreaterThan(0);
    for (const adj of ADJECTIVES) {
      expect(typeof adj).toBe("string");
      expect(adj.length).toBeGreaterThan(0);
    }
  });

  test("NOUNS is a non-empty array of strings", () => {
    expect(NOUNS.length).toBeGreaterThan(0);
    for (const noun of NOUNS) {
      expect(typeof noun).toBe("string");
      expect(noun.length).toBeGreaterThan(0);
    }
  });

  test("ADJECTIVES has no duplicates", () => {
    expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length);
  });

  test("NOUNS has no duplicates", () => {
    expect(new Set(NOUNS).size).toBe(NOUNS.length);
  });
});
