import { getAgentCommand } from "../config";
import {
  getMainWorktree,
  getProjectName,
  getWorktreeName,
  isRiftWorktree,
} from "../git";
import { registerAgent, unregisterAgent, isRegistered } from "../agents";
import { writeCdPath } from "../ipc";

export async function cmdRunAgent(): Promise<void> {
  const shellPid = Number(process.env.RIFT_SHELL_PID);
  if (!shellPid) {
    console.error(
      "Error: _run-agent requires shell integration (RIFT_SHELL_PID)",
    );
    process.exit(1);
  }

  const agentCmd = await getAgentCommand();
  const mainWorktreePath = await getMainWorktree();

  if (!(await isRiftWorktree())) {
    // Base worktree: run agent directly, no registration/watching
    const proc = Bun.spawn(["bash", "-c", agentCmd], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await proc.exited;
    process.exit(code ?? 0);
  }

  const project = await getProjectName();
  const worktree = await getWorktreeName();

  const agentProc = Bun.spawn(["bash", "-c", agentCmd], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  registerAgent(project, worktree, {
    shellPid,
    agentPid: agentProc.pid,
    mainWorktreePath,
  });

  // Ignore SIGINT — the agent receives it from the terminal directly.
  // We need _run-agent to survive so it can clean up after the agent exits.
  process.on("SIGINT", () => {});

  const result = await Promise.race([
    agentProc.exited.then((code) => ({ type: "agent-exit" as const, code })),
    pollForShutdown(project, worktree, shellPid).then(() => ({
      type: "shutdown" as const,
    })),
  ]);

  if (result.type === "agent-exit") {
    unregisterAgent(project, worktree, shellPid);
    process.exit(result.code ?? 0);
  }

  // Shutdown detected — kill agent gracefully
  agentProc.kill("SIGINT");

  const exitCode = await Promise.race([
    agentProc.exited,
    Bun.sleep(5000).then(() => null),
  ]);

  if (exitCode === null) {
    agentProc.kill("SIGKILL");
    await agentProc.exited;
  }

  writeCdPath(mainWorktreePath);
  process.exit(0);
}

function pollForShutdown(
  project: string,
  worktree: string,
  shellPid: number,
): Promise<void> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (!isRegistered(project, worktree, shellPid)) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
    // Don't let this timer keep the process alive if the agent exits first
    if (typeof interval === "object" && "unref" in interval) {
      (interval as NodeJS.Timeout).unref();
    }
  });
}
