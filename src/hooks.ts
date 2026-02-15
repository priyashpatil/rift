import { basename } from "path";
import { getRiftConfig } from "./config";

type HookName = "open" | "jump" | "close" | "purge";

export async function runHook(
  hookName: HookName,
  runDir: string,
): Promise<void> {
  const config = await getRiftConfig(runDir);
  const script = config.hooks?.[hookName];
  if (!script) return;

  console.log(`Running ${hookName} hook...`);
  const proc = Bun.spawn(["bash", "-c", script], {
    cwd: runDir,
    env: { ...process.env, RIFT_WORKTREE: basename(runDir) },
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}
