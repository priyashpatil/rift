import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { CONFIG_DIR, GLOBAL_CONFIG_PATH } from "./constants";
import { getMainWorktree } from "./git";
import type { RiftConfig, GlobalConfig, Editor } from "./types";

export const EDITORS: Editor[] = [
  { name: "VS Code", cmd: "code", managedWorkspace: true },
  { name: "Cursor", cmd: "cursor", managedWorkspace: true },
  { name: "Windsurf", cmd: "windsurf", managedWorkspace: true },
];

const DEFAULT_EDITOR: Editor = EDITORS.find((e) => e.cmd === "code")!;

export async function getRiftConfig(dir = "."): Promise<RiftConfig> {
  try {
    const mainRepo = await getMainWorktree(dir);
    const configFile = join(mainRepo, "rift.yaml");
    if (!existsSync(configFile)) return {};
    const content = readFileSync(configFile, "utf-8");
    return (yaml.load(content) as RiftConfig) || {};
  } catch {
    return {};
  }
}

export async function saveRiftConfig(
  updates: Partial<RiftConfig>,
): Promise<void> {
  const mainRepo = await getMainWorktree();
  const configFile = join(mainRepo, "rift.yaml");
  if (!existsSync(configFile)) {
    throw new Error(
      "no rift.yaml found. Run 'rift init' first to initialize the project.",
    );
  }
  const existing =
    (yaml.load(readFileSync(configFile, "utf-8")) as RiftConfig) || {};
  const merged = { ...existing, ...updates };
  writeFileSync(configFile, yaml.dump(merged));
}

export function getGlobalConfig(): GlobalConfig {
  try {
    if (!existsSync(GLOBAL_CONFIG_PATH)) return {};
    const content = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
    return (yaml.load(content) as GlobalConfig) || {};
  } catch {
    return {};
  }
}

export function saveGlobalConfig(config: GlobalConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(GLOBAL_CONFIG_PATH, yaml.dump(config));
}

export async function getAgentCommand(): Promise<string> {
  const riftConfig = await getRiftConfig();
  if (riftConfig.agent) return riftConfig.agent;
  const config = getGlobalConfig();
  return config.agent || "claude";
}

export async function warnIfAgentMissing(): Promise<void> {
  const cmd = await getAgentCommand();
  const bin = cmd.split(/\s+/)[0];
  if (!Bun.which(bin)) {
    console.error(`Warning: agent command "${bin}" not found on PATH`);
  }
}

export async function getEditor(): Promise<Editor> {
  const riftConfig = await getRiftConfig();
  if (riftConfig.editor) {
    return EDITORS.find((e) => e.cmd === riftConfig.editor) || DEFAULT_EDITOR;
  }
  const config = getGlobalConfig();
  return EDITORS.find((e) => e.cmd === config.editor) || DEFAULT_EDITOR;
}
