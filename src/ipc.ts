import { writeFileSync } from "fs";
import { CD_PATH_FILE, AGENT_START_FILE } from "./constants";

export function writeCdPath(path: string): void {
  writeFileSync(CD_PATH_FILE, path);
}

export function signalAgentStart(): void {
  writeFileSync(AGENT_START_FILE, "");
}
