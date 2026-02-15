import { existsSync, readFileSync, appendFileSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";
import { getGlobalConfig, saveGlobalConfig, EDITORS, AGENTS } from "../config";
import { promptChoice } from "../prompt";

const GUARD_COMMENT = "# Added by rift configure";

function detectShell(): string {
  const shell = process.env.SHELL || "";
  const name = basename(shell);
  if (["zsh", "bash", "fish"].includes(name)) return name;
  return "zsh";
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
      return join(home, ".zshrc");
  }
}

function getInitLine(shell: string): string {
  if (shell === "fish") return "rift init | source";
  return 'eval "$(rift init)"';
}

function makeLabels(
  items: { name: string; cmd: string }[],
  currentCmd: string,
): string[] {
  return items.map((item) =>
    item.cmd === currentCmd
      ? `${item.name} [${item.cmd}] (current)`
      : `${item.name} [${item.cmd}]`,
  );
}

export async function cmdConfigure(): Promise<void> {
  const shell = detectShell();
  const rcPath = getRcPath(shell);

  console.log(`Detected shell: ${shell}`);
  console.log(`RC file: ${rcPath}`);
  console.log();

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

  const config = getGlobalConfig();

  // Editor selection
  console.log();
  const currentEditor = config.editor || "code";
  const editorLabels = makeLabels(EDITORS, currentEditor);
  const editorChoice = await promptChoice("Editor:", editorLabels);

  if (editorChoice !== null) {
    config.editor = EDITORS[editorChoice].cmd;
    console.log(`\nEditor set to: ${EDITORS[editorChoice].name} [${config.editor}]`);
  } else {
    console.log(`\nKept current editor: ${currentEditor}`);
  }

  // Agent selection
  console.log();
  const currentAgent = config.agent || "claude";
  const agentLabels = makeLabels(AGENTS, currentAgent);
  const agentChoice = await promptChoice("AI agent:", agentLabels);

  if (agentChoice !== null) {
    config.agent = AGENTS[agentChoice].cmd;
    console.log(`\nAgent set to: ${AGENTS[agentChoice].name} [${config.agent}]`);
  } else {
    console.log(`\nKept current agent: ${currentAgent}`);
  }

  saveGlobalConfig(config);
  console.log("\nConfiguration complete. Restart your shell to apply changes.");
}
