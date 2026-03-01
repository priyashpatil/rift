#!/usr/bin/env bun

import { cmdHelp, showCommandHelp } from "./commands/help";
import { cmdStatus } from "./commands/status";
import { cmdOpen } from "./commands/open";
import { cmdList } from "./commands/list";
import { cmdClose } from "./commands/close";
import { cmdJump } from "./commands/jump";
import { cmdCode } from "./commands/code";
import { cmdPurge } from "./commands/purge";
import { cmdInit } from "./commands/init";
import { cmdShellInit } from "./commands/shell-init";
import { cmdConfig } from "./commands/config";
import { cmdVersion } from "./commands/version";
import { cmdUpdate, didUpdate } from "./commands/update";
import { getAgentCommand } from "./config";
import { cmdRunAgent } from "./commands/run-agent";
import { checkForUpdates } from "./update-check";

const args = process.argv.slice(2);
const command = args[0] || "help";
const rest = args.slice(1);

if (rest.includes("--help") || rest.includes("-h")) {
  showCommandHelp(command);
  process.exit(0);
}

try {
  switch (command) {
    case "status":
      await cmdStatus();
      break;
    case "open":
      await cmdOpen(rest);
      break;
    case "list":
    case "ls":
      await cmdList();
      break;
    case "close":
      await cmdClose(rest);
      break;
    case "jump":
      await cmdJump(rest);
      break;
    case "code":
      await cmdCode();
      break;
    case "purge":
      await cmdPurge(rest);
      break;
    case "init":
      await cmdInit(rest);
      break;
    case "_shell-init":
      cmdShellInit();
      break;
    case "config":
      await cmdConfig(rest);
      break;
    case "_agent-cmd":
      console.log(await getAgentCommand());
      break;
    case "_run-agent":
      await cmdRunAgent();
      break;
    case "update":
      await cmdUpdate();
      break;
    case "version":
    case "--version":
    case "-v":
      cmdVersion();
      break;
    case "help":
    case "--help":
    case "-h":
      cmdHelp();
      break;
    default:
      console.error(`Error: unknown command: ${command}`);
      cmdHelp();
      process.exit(1);
  }
  // Check for updates after user-facing commands (skip internal/shell commands)
  if (!command.startsWith("_") && !didUpdate) {
    await checkForUpdates();
  }
} catch (err) {
  if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  }
  process.exit(1);
}
