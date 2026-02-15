import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";

const testDir = join(tmpdir(), `.rift-test-workspace-${process.pid}`);
const testWorkspacesDir = join(testDir, "workspaces");
const testWorktreesDir = join(testDir, "worktrees");

// Mock constants and git before importing workspace
mock.module("../constants", () => ({
  WORKSPACES_DIR: testWorkspacesDir,
  WORKTREES_DIR: testWorktreesDir,
  RIFT_DIR: testDir,
  CONFIG_DIR: join(testDir, "config"),
  GLOBAL_CONFIG_PATH: join(testDir, "config", "config.yaml"),
  CD_PATH_FILE: join(testDir, ".rift_cd_path"),
  AGENT_START_FILE: join(testDir, ".rift_start_agent"),
  ADJECTIVES: ["bold"],
  NOUNS: ["ant"],
}));

let defaultBranchResult: Promise<string> = Promise.resolve("main");
mock.module("../git", () => ({
  getDefaultBranch: () => defaultBranchResult,
}));

// Import after mocks
const { syncWorkspace } = await import("../workspace");

describe("workspace", () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(testWorkspacesDir, { recursive: true });
    mkdirSync(testWorktreesDir, { recursive: true });
    defaultBranchResult = Promise.resolve("main");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("creates workspace file when none exists", async () => {
    const mainRepo = "/fake/main/repo";

    await syncWorkspace("myproject", mainRepo);

    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");
    expect(existsSync(wsPath)).toBe(true);
    const content = JSON.parse(readFileSync(wsPath, "utf-8"));
    expect(content.folders).toBeDefined();
    expect(content.folders[0].name).toBe("main");
    expect(content.folders[0].path).toBe(mainRepo);
  });

  test("updates existing workspace file preserving extra keys", async () => {
    const mainRepo = "/fake/main/repo";
    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");

    writeFileSync(
      wsPath,
      JSON.stringify(
        {
          folders: [{ name: "old", path: "/old/path" }],
          settings: { "editor.fontSize": 14 },
        },
        null,
        2,
      ) + "\n",
    );

    await syncWorkspace("myproject", mainRepo);

    const content = JSON.parse(readFileSync(wsPath, "utf-8"));
    expect(content.settings).toEqual({ "editor.fontSize": 14 });
    expect(content.folders[0].name).toBe("main");
    expect(content.folders[0].path).toBe(mainRepo);
  });

  test("includes worktree directories sorted alphabetically", async () => {
    const mainRepo = "/fake/main/repo";
    const projectWtDir = join(testWorktreesDir, "myproject");
    mkdirSync(projectWtDir, { recursive: true });
    mkdirSync(join(projectWtDir, "zeta"), { recursive: true });
    mkdirSync(join(projectWtDir, "alpha"), { recursive: true });
    mkdirSync(join(projectWtDir, "middle"), { recursive: true });

    await syncWorkspace("myproject", mainRepo);

    const wsPath = join(testWorkspacesDir, "myproject.code-workspace");
    const content = JSON.parse(readFileSync(wsPath, "utf-8"));
    expect(content.folders).toHaveLength(4);
    expect(content.folders[0].name).toBe("main");
    expect(content.folders[1].name).toBe("alpha");
    expect(content.folders[2].name).toBe("middle");
    expect(content.folders[3].name).toBe("zeta");
  });

  test("falls back to 'main' when getDefaultBranch throws", async () => {
    defaultBranchResult = Promise.reject(new Error("no branch"));
    const mainRepo = "/fake/main/repo";

    await syncWorkspace("fallback-project", mainRepo);

    const wsPath = join(testWorkspacesDir, "fallback-project.code-workspace");
    const content = JSON.parse(readFileSync(wsPath, "utf-8"));
    expect(content.folders[0].name).toBe("main");
  });

  test("handles project with no worktree directory", async () => {
    const mainRepo = "/fake/main/repo";

    await syncWorkspace("no-worktrees", mainRepo);

    const wsPath = join(testWorkspacesDir, "no-worktrees.code-workspace");
    const content = JSON.parse(readFileSync(wsPath, "utf-8"));
    expect(content.folders).toHaveLength(1);
    expect(content.folders[0].name).toBe("main");
  });
});
