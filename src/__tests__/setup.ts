import { spawn, execFileSync } from "child_process";
import { writeFileSync } from "fs";

function which(bin: string): string | null {
  try {
    return execFileSync("which", [bin], { encoding: "utf-8" }).trim() || null;
  } catch {
    return null;
  }
}

// Polyfill Bun globals for Vitest (runs in Node, not Bun)
if (typeof globalThis.Bun === "undefined") {
  (globalThis as any).Bun = {
    spawn(cmd: string[], opts: any = {}) {
      const proc = spawn(cmd[0], cmd.slice(1), {
        cwd: opts.cwd,
        env: opts.env,
        stdio: [
          "pipe",
          opts.stdout === "pipe"
            ? "pipe"
            : opts.stdout === "inherit"
              ? "inherit"
              : "pipe",
          opts.stderr === "pipe"
            ? "pipe"
            : opts.stderr === "inherit"
              ? "inherit"
              : "pipe",
        ],
      });

      const stdoutChunks: Buffer[] = [];

      if (proc.stdout) {
        proc.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
      }

      const exited = new Promise<number>((resolve) => {
        proc.on("close", (code) => resolve(code ?? 1));
      });

      // Create a ReadableStream from stdout for Response compatibility
      const stdoutStream = new ReadableStream({
        start(controller) {
          if (proc.stdout) {
            proc.stdout.on("data", (chunk: Buffer) =>
              controller.enqueue(chunk),
            );
            proc.stdout.on("end", () => controller.close());
          } else {
            controller.close();
          }
        },
      });

      return {
        stdout: stdoutStream,
        stderr: proc.stderr,
        exited,
        pid: proc.pid,
        kill(signal?: string) {
          proc.kill(signal as any);
        },
      };
    },

    sleep(ms: number) {
      return new Promise<void>((resolve) => setTimeout(resolve, ms));
    },

    write(path: string, content: string) {
      writeFileSync(path, content);
    },

    which,
  };
}

// Polyfill console async iterator (Bun-specific feature used in prompt.ts)
// In Node, console is not async iterable. This provides a no-op iterator
// that immediately returns done:true, allowing tests to exercise the code path.
if (!(Symbol.asyncIterator in console)) {
  (console as any)[Symbol.asyncIterator] = function () {
    return {
      next() {
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  };
}
