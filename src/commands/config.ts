import { existsSync, readFileSync, appendFileSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";
import {
  getGlobalConfig,
  saveGlobalConfig,
  getRiftConfig,
  saveRiftConfig,
  EDITORS,
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
  switch (shell) {
    case "zsh":
      return join(home, ".zshrc");
    case "bash":
      const bashrc = join(home, ".bashrc");
      return existsSync(bashrc) ? bashrc : join(home, ".bash_profile");
    case "fish":
      return join(home, ".config", "fish", "config.fish");
    default:
      throw new Error(`no rc path for shell "${shell}"`);
  }
}

function getInitLine(shell: string): string {
  if (shell === "fish") return "rift _shell-init | source";
  return 'eval "$(rift _shell-init)"';
}

function parseFlags(args: string[]): {
  editor?: string;
  agent?: string;
  global: boolean;
} {
  const flags: { editor?: string; agent?: string; global: boolean } = {
    global: false,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--editor" && args[i + 1]) {
      flags.editor = args[++i];
    } else if (args[i] === "--agent" && args[i + 1]) {
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

  if (flags.editor) {
    if (!EDITORS.some((e) => e.cmd === flags.editor)) {
      const valid = EDITORS.map((e) => e.cmd).join(", ");
      throw new Error(
        `unknown editor "${flags.editor}". Available editors: ${valid}`,
      );
    }
    changed = true;
  }

  if (flags.agent) {
    changed = true;
  }

  if (changed) {
    const updates: Record<string, string> = {};
    if (flags.editor) updates.editor = flags.editor;
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

  const editorCmd = riftConfig.editor || globalConfig.editor || "code";
  const agentCmd = riftConfig.agent || globalConfig.agent || "claude";
  const editorName =
    EDITORS.find((e) => e.cmd === editorCmd)?.name || editorCmd;

  console.log(`  editor: ${editorName} [${editorCmd}]`);
  console.log(`  agent:  ${agentCmd}`);
}
