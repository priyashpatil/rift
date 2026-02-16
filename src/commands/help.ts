const commandHelp: Record<string, string> = {
  status: `Usage: rift status

Show the current rift context: project, branch, worktree, and agent.`,

  open: `Usage: rift open [name] [options]

Create a new worktree and launch the configured AI agent.
If no name is given, you will be prompted to enter one.

Options:
  --base <branch>   Base branch for the worktree (default: current branch)
  --skip-agent      Create the worktree without launching an agent`,

  list: `Usage: rift list

List all rift-managed worktrees for the current project.

Aliases: ls`,

  close: `Usage: rift close [options]

Close the current worktree and switch back to the main repository.
Must be run from inside a rift worktree.

Options:
  -f, --force       Skip confirmation prompt`,

  main: `Usage: rift main

Switch back to the main repository from a worktree.

Aliases: base`,

  jump: `Usage: rift jump <name> [options]

Switch to an existing worktree and start the configured agent.

Options:
  --skip-agent      Switch without launching an agent`,

  code: `Usage: rift code

Open the current project in the configured editor.`,

  purge: `Usage: rift purge [options]

Remove ALL rift-managed worktrees for the current project.

Options:
  -f, --force       Skip confirmation prompt`,

  init: `Usage: rift init [options]

Initialize a rift.yaml configuration file in the current git project.

Options:
  --editor <cmd>    Editor command (e.g. "code", "cursor")
  --agent <cmd>     AI agent command (e.g. "claude", "copilot")`,

  configure: `Usage: rift configure [options]

Set up shell integration and global preferences.

Options:
  --editor <cmd>    Set default editor (e.g. "code", "cursor", "windsurf")
  --agent <cmd>     Set default AI agent (e.g. "claude", "copilot", "gemini")

Run without flags to set up shell integration and show current config.`,

  version: `Usage: rift version

Show the rift version number.`,
};

// Resolve aliases to canonical command names
const aliases: Record<string, string> = {
  ls: "list",
  base: "main",
};

export function showCommandHelp(command: string): void {
  const canonical = aliases[command] || command;
  const help = commandHelp[canonical];
  if (help) {
    console.log(help);
  } else {
    cmdHelp();
  }
}

export function cmdHelp(): void {
  console.log(`Rift - Git worktree manager for parallel AI agent development

Usage: rift <command> [options]

Commands:
  status            Show current context
  open [name]       Create a new worktree and launch agent
  list              List worktrees for current project
  close             Close current worktree (must be in rift worktree)
  main              Switch to main repository
  jump <name>       Switch to a worktree and start agent
  code              Open project in configured editor
  purge             Remove ALL worktrees for current project
  init              Initialize rift.yaml in current git project
  configure         Set up shell integration and global preferences
  version           Show version number

Options:
  --base <branch>   Base branch for new worktree (default: current branch)
  --skip-agent      Don't launch agent after opening worktree
  --editor <cmd>    Editor to use (init, configure)
  --agent <cmd>     AI agent to use (init, configure)
  -f, --force       Skip confirmation prompts

Run 'rift <command> --help' for more information on a command.`);
}
