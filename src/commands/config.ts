import { existsSync, readFileSync, appendFileSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";
import {
  getGlobalConfig,
  saveGlobalConfig,
  getRiftConfig,
  saveRiftConfig,
} from "../config";
import { isGitRepo } from "../git";

const GUARD_COMMENT = "# Added by rift";

const SUPPORTED_SHELLS = ["zsh", "bash", "fish"];

function detectShell(): string {
  const shell = process.env.SHELL || "";
  const name = basename(shell);
  if (SUPPORTED_SHELLS.includes(name)) return name;
  throw new Error(
    `unsupported shell "${name || "(unknown)"}". Supported shells: ${SUPPORTED_SHELLS.join(", ")}`,
  );
}

function getRcPath(shell: string): string {
  const home = homedir();
  if (shell === "zsh") return join(home, ".zshrc");
  if (shell === "fish") return join(home, ".config", "fish", "config.fish");

  const bashrc = join(home, ".bashrc");
  return existsSync(bashrc) ? bashrc : join(home, ".bash_profile");
}

function getInitLine(shell: string): string {
  if (shell === "fish") return "rift _shell-init | source";
  return 'eval "$(rift _shell-init)"';
}

function parseFlags(args: string[]): {
  agent?: string;
  global: boolean;
} {
  const flags: { agent?: string; global: boolean } = {
    global: false,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--agent" && args[i + 1]) {
      flags.agent = args[++i];
    } else if (args[i] === "--global") {
      flags.global = true;
    }
  }
  return flags;
}

export async function cmdConfig(args: string[]): Promise<void> {
  const shell = detectShell();
  const rcPath = getRcPath(shell);

  // Shell integration
  if (existsSync(rcPath)) {
    const content = readFileSync(rcPath, "utf-8");
    if (content.includes(GUARD_COMMENT)) {
      console.log("Shell integration already configured.");
    } else {
      const initLine = getInitLine(shell);
      appendFileSync(rcPath, `\n${GUARD_COMMENT}\n${initLine}\n`);
      console.log(`Added shell integration to ${rcPath}`);
    }
  } else {
    const initLine = getInitLine(shell);
    appendFileSync(rcPath, `${GUARD_COMMENT}\n${initLine}\n`);
    console.log(`Created ${rcPath} with shell integration.`);
  }

  const flags = parseFlags(args);
  let changed = false;

  if (flags.agent) {
    changed = true;
  }

  if (changed) {
    const updates: Record<string, string> = {};
    if (flags.agent) updates.agent = flags.agent;

    if (flags.global) {
      const config = getGlobalConfig();
      Object.assign(config, updates);
      saveGlobalConfig(config);
      console.log("Global config updated.");
    } else {
      if (!(await isGitRepo())) {
        throw new Error(
          "not a git repository. Use --global to set global defaults, or run from a git project.",
        );
      }
      await saveRiftConfig(updates);
      console.log("Project config updated (rift.yaml).");
    }
  }

  // Show effective config (project overrides global)
  const riftConfig = (await isGitRepo()) ? await getRiftConfig() : {};
  const globalConfig = getGlobalConfig();

  const agentCmd = riftConfig.agent || globalConfig.agent || "codex";

  console.log(`  agent:  ${agentCmd}`);
}
