import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { existsSync, readFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { AGENTS_DIR } from "../constants";
import {
  agentDir,
  agentFile,
  registerAgent,
  unregisterAgent,
  removeWorktreeAgents,
  removeProjectAgents,
  isRegistered,
} from "../agents";
import type { AgentRegistration } from "../types";

describe("agents", () => {
  const project = "test-project";
  const worktree = "bold-ant";

  beforeEach(() => {
    rmSync(join(AGENTS_DIR, project), { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(join(AGENTS_DIR, project), { recursive: true, force: true });
  });

  describe("agentDir", () => {
    test("returns correct path", () => {
      expect(agentDir(project, worktree)).toBe(
        join(AGENTS_DIR, project, worktree),
      );
    });
  });

  describe("agentFile", () => {
    test("returns correct path with shell pid", () => {
      expect(agentFile(project, worktree, 12345)).toBe(
        join(AGENTS_DIR, project, worktree, "12345"),
      );
    });
  });

  describe("registerAgent", () => {
    test("creates registration file with correct JSON", () => {
      const reg: AgentRegistration = {
        shellPid: 12345,
        agentPid: 67890,
        mainWorktreePath: "/main/repo",
      };
      const path = registerAgent(project, worktree, reg);
      expect(existsSync(path)).toBe(true);
      const data = JSON.parse(readFileSync(path, "utf-8"));
      expect(data).toEqual(reg);
    });

    test("creates parent directories", () => {
      registerAgent(project, worktree, {
        shellPid: 11111,
        agentPid: 22222,
        mainWorktreePath: "/main/repo",
      });
      expect(existsSync(agentDir(project, worktree))).toBe(true);
    });

    test("supports multiple registrations per worktree", () => {
      registerAgent(project, worktree, {
        shellPid: 111,
        agentPid: 222,
        mainWorktreePath: "/main/repo",
      });
      registerAgent(project, worktree, {
        shellPid: 333,
        agentPid: 444,
        mainWorktreePath: "/main/repo",
      });
      expect(isRegistered(project, worktree, 111)).toBe(true);
      expect(isRegistered(project, worktree, 333)).toBe(true);
    });
  });

  describe("unregisterAgent", () => {
    test("removes registration file", () => {
      registerAgent(project, worktree, {
        shellPid: 12345,
        agentPid: 67890,
        mainWorktreePath: "/main/repo",
      });
      expect(isRegistered(project, worktree, 12345)).toBe(true);

      unregisterAgent(project, worktree, 12345);
      expect(isRegistered(project, worktree, 12345)).toBe(false);
    });

    test("does not throw when file does not exist", () => {
      expect(() => unregisterAgent(project, worktree, 99999)).not.toThrow();
    });

    test("cleans up empty directories", () => {
      registerAgent(project, worktree, {
        shellPid: 12345,
        agentPid: 67890,
        mainWorktreePath: "/main/repo",
      });
      unregisterAgent(project, worktree, 12345);
      expect(existsSync(agentDir(project, worktree))).toBe(false);
      expect(existsSync(join(AGENTS_DIR, project))).toBe(false);
    });

    test("preserves other registrations in same worktree", () => {
      registerAgent(project, worktree, {
        shellPid: 111,
        agentPid: 222,
        mainWorktreePath: "/main/repo",
      });
      registerAgent(project, worktree, {
        shellPid: 333,
        agentPid: 444,
        mainWorktreePath: "/main/repo",
      });

      unregisterAgent(project, worktree, 111);
      expect(isRegistered(project, worktree, 111)).toBe(false);
      expect(isRegistered(project, worktree, 333)).toBe(true);
    });
  });

  describe("removeWorktreeAgents", () => {
    test("removes all registrations for a worktree", () => {
      registerAgent(project, worktree, {
        shellPid: 111,
        agentPid: 222,
        mainWorktreePath: "/main/repo",
      });
      registerAgent(project, worktree, {
        shellPid: 333,
        agentPid: 444,
        mainWorktreePath: "/main/repo",
      });

      const removed = removeWorktreeAgents(project, worktree);
      expect(removed).toHaveLength(2);
      expect(isRegistered(project, worktree, 111)).toBe(false);
      expect(isRegistered(project, worktree, 333)).toBe(false);
    });

    test("returns removed registrations with correct data", () => {
      registerAgent(project, worktree, {
        shellPid: 111,
        agentPid: 222,
        mainWorktreePath: "/main/repo",
      });

      const removed = removeWorktreeAgents(project, worktree);
      expect(removed[0].shellPid).toBe(111);
      expect(removed[0].agentPid).toBe(222);
      expect(removed[0].mainWorktreePath).toBe("/main/repo");
    });

    test("returns empty array when no registrations exist", () => {
      const removed = removeWorktreeAgents(project, "nonexistent");
      expect(removed).toEqual([]);
    });

    test("preserves other worktrees in same project", () => {
      registerAgent(project, "wt1", {
        shellPid: 111,
        agentPid: 222,
        mainWorktreePath: "/main/repo",
      });
      registerAgent(project, "wt2", {
        shellPid: 333,
        agentPid: 444,
        mainWorktreePath: "/main/repo",
      });

      removeWorktreeAgents(project, "wt1");
      expect(isRegistered(project, "wt2", 333)).toBe(true);
    });
  });

  describe("removeProjectAgents", () => {
    test("removes all registrations across all worktrees", () => {
      registerAgent(project, "wt1", {
        shellPid: 111,
        agentPid: 222,
        mainWorktreePath: "/main/repo",
      });
      registerAgent(project, "wt2", {
        shellPid: 333,
        agentPid: 444,
        mainWorktreePath: "/main/repo",
      });

      const removed = removeProjectAgents(project);
      expect(removed).toHaveLength(2);
      expect(existsSync(join(AGENTS_DIR, project))).toBe(false);
    });

    test("returns empty array when project has no registrations", () => {
      const removed = removeProjectAgents("nonexistent-project");
      expect(removed).toEqual([]);
    });
  });

  describe("isRegistered", () => {
    test("returns true for registered agent", () => {
      registerAgent(project, worktree, {
        shellPid: 12345,
        agentPid: 67890,
        mainWorktreePath: "/main/repo",
      });
      expect(isRegistered(project, worktree, 12345)).toBe(true);
    });

    test("returns false for unregistered agent", () => {
      expect(isRegistered(project, worktree, 99999)).toBe(false);
    });
  });
});
