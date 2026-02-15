import {
  existsSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
  mkdirSync,
  chmodSync,
} from "fs";
import { join, dirname } from "path";
import yaml from "js-yaml";
import { isGitRepo, getMainWorktree } from "../git";
import { getGlobalConfig, EDITORS, AGENTS } from "../config";
import { promptYesNo, promptString, promptChoice } from "../prompt";
import type { RiftConfig } from "../types";

const DEFAULT_BOOTSTRAP_PATH = "scripts/bootstrap.sh";

const BOOTSTRAP_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail

# Derive a deterministic port from the worktree name.
# The same worktree always gets the same port (range 3000–9999).
hash=$(echo -n "$RIFT_WORKTREE" | shasum | tr -d 'a-f ' | cut -c1-4)
PORT=$(( (hash % 7000) + 3000 ))

echo "PORT=$PORT" > .env
echo "Assigned port $PORT for worktree '$RIFT_WORKTREE'"
`;

function parseFlags(args: string[]): { editor?: string; agent?: string } {
  const flags: { editor?: string; agent?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--editor" && args[i + 1]) {
      flags.editor = args[++i];
    } else if (args[i] === "--agent" && args[i + 1]) {
      flags.agent = args[++i];
    }
  }
  return flags;
}

function addToGitignore(mainRepo: string, entry: string): void {
  const gitignorePath = join(mainRepo, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (content.split("\n").some((line) => line.trim() === entry)) return;
    appendFileSync(gitignorePath, `\n${entry}\n`);
  } else {
    writeFileSync(gitignorePath, `${entry}\n`);
  }
}

export async function cmdInit(args: string[]): Promise<void> {
  if (!(await isGitRepo())) {
    throw new Error("not a git repository. Run this inside a git project.");
  }

  const mainRepo = await getMainWorktree();
  const configPath = join(mainRepo, "rift.yaml");

  if (existsSync(configPath)) {
    throw new Error(`rift.yaml already exists at ${configPath}`);
  }

  const flags = parseFlags(args);
  const global = getGlobalConfig();

  const editor = flags.editor || global.editor || "code";
  const agent = flags.agent || global.agent || "claude";

  // Validate editor
  if (!EDITORS.some((e) => e.cmd === editor)) {
    const valid = EDITORS.map((e) => e.cmd).join(", ");
    throw new Error(`unknown editor "${editor}". Valid editors: ${valid}`);
  }

  // Validate agent
  if (!AGENTS.some((a) => a.cmd === agent)) {
    const valid = AGENTS.map((a) => a.cmd).join(", ");
    throw new Error(`unknown agent "${agent}". Valid agents: ${valid}`);
  }

  const config: RiftConfig = {
    editor,
    agent,
    hooks: {},
  };

  // Bootstrap pattern setup
  console.log();
  console.log("When you run multiple worktrees, their dev servers compete for the");
  console.log("same port. The bootstrap pattern runs a command on open and jump");
  console.log("hooks that derives a deterministic port from each worktree name,");
  console.log("so every worktree gets its own port automatically.\n");
  const wantBootstrap = await promptYesNo(
    "Set up the bootstrap pattern? [y/N] ",
  );

  if (wantBootstrap) {
    console.log();
    console.log("How should the bootstrap command run? You can generate a ready-made");
    console.log("bash script, or enter your own command (e.g. npm run bootstrap).\n");
    const methodChoice = await promptChoice("Bootstrap method:", [
      "Generate a bash script",
      "Custom command",
    ]);

    let hookCmd: string;

    if (methodChoice === 1) {
      // Custom command
      console.log();
      console.log("Enter the command that will run on open and jump hooks.");
      console.log("The RIFT_WORKTREE environment variable is available.\n");
      const cmd = await promptString("Hook command: ");
      if (!cmd) {
        console.log("\nNo command entered, skipping bootstrap setup.");
      } else {
        hookCmd = cmd;
        config.hooks = { open: hookCmd, jump: hookCmd };
        addToGitignore(mainRepo, ".env");
        console.log("Added .env to .gitignore");
      }
    } else if (methodChoice === 0) {
      // Generate bash script
      console.log();
      console.log("Where should the bootstrap script be saved?\n");
      const input = await promptString(
        `Script path [${DEFAULT_BOOTSTRAP_PATH}]: `,
      );
      const scriptPath = input || DEFAULT_BOOTSTRAP_PATH;
      const fullScriptPath = join(mainRepo, scriptPath);

      if (existsSync(fullScriptPath)) {
        console.log(`\n${scriptPath} already exists, skipping script creation.`);
      } else {
        mkdirSync(dirname(fullScriptPath), { recursive: true });
        writeFileSync(fullScriptPath, BOOTSTRAP_SCRIPT);
        chmodSync(fullScriptPath, 0o755);
        console.log(`\nCreated ${scriptPath}`);
      }

      hookCmd = `bash ${scriptPath}`;
      config.hooks = { open: hookCmd, jump: hookCmd };
      addToGitignore(mainRepo, ".env");
      console.log("Added .env to .gitignore");
    }
  }

  writeFileSync(configPath, yaml.dump(config));

  const editorName = EDITORS.find((e) => e.cmd === editor)?.name || editor;
  const agentName = AGENTS.find((a) => a.cmd === agent)?.name || agent;

  console.log(`\nInitialized rift.yaml in ${mainRepo}`);
  console.log(`  editor: ${editorName} [${editor}]`);
  console.log(`  agent:  ${agentName} [${agent}]`);
  if (config.hooks?.open) {
    console.log(`  hooks:  open, jump → ${config.hooks.open}`);
  }
}
