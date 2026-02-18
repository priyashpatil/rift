import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
  readdirSync,
  rmdirSync,
  rmSync,
} from "fs";
import { join } from "path";
import { AGENTS_DIR } from "./constants";
import type { AgentRegistration } from "./types";

export function agentDir(project: string, worktree: string): string {
  return join(AGENTS_DIR, project, worktree);
}

export function agentFile(
  project: string,
  worktree: string,
  shellPid: number,
): string {
  return join(agentDir(project, worktree), String(shellPid));
}

export function registerAgent(
  project: string,
  worktree: string,
  registration: AgentRegistration,
): string {
  const dir = agentDir(project, worktree);
  mkdirSync(dir, { recursive: true });
  const filePath = agentFile(project, worktree, registration.shellPid);
  writeFileSync(filePath, JSON.stringify(registration));
  return filePath;
}

export function unregisterAgent(
  project: string,
  worktree: string,
  shellPid: number,
): void {
  const filePath = agentFile(project, worktree, shellPid);
  try {
    unlinkSync(filePath);
  } catch {}
  cleanEmptyDir(agentDir(project, worktree));
  cleanEmptyDir(join(AGENTS_DIR, project));
}

export function removeWorktreeAgents(
  project: string,
  worktree: string,
): AgentRegistration[] {
  const dir = agentDir(project, worktree);
  if (!existsSync(dir)) return [];
  const removed: AgentRegistration[] = [];
  for (const entry of readdirSync(dir)) {
    try {
      const data = JSON.parse(
        readFileSync(join(dir, entry), "utf-8"),
      ) as AgentRegistration;
      removed.push(data);
    } catch {}
  }
  rmSync(dir, { recursive: true, force: true });
  cleanEmptyDir(join(AGENTS_DIR, project));
  return removed;
}

export function removeProjectAgents(project: string): AgentRegistration[] {
  const dir = join(AGENTS_DIR, project);
  if (!existsSync(dir)) return [];
  const removed: AgentRegistration[] = [];
  for (const wtEntry of readdirSync(dir)) {
    const wtDir = join(dir, wtEntry);
    try {
      for (const pidEntry of readdirSync(wtDir)) {
        try {
          const data = JSON.parse(
            readFileSync(join(wtDir, pidEntry), "utf-8"),
          ) as AgentRegistration;
          removed.push(data);
        } catch {}
      }
    } catch {}
  }
  rmSync(dir, { recursive: true, force: true });
  return removed;
}

export function isRegistered(
  project: string,
  worktree: string,
  shellPid: number,
): boolean {
  return existsSync(agentFile(project, worktree, shellPid));
}

function cleanEmptyDir(dir: string): void {
  try {
    rmdirSync(dir); // Only succeeds on empty directories
  } catch {}
}
