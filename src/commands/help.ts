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
  configure         Set up shell integration and agent preference
  init              Output shell wrapper function

Options:
  --base <branch>   Base branch for new worktree (default: current branch)
  --skip-agent      Don't launch agent after opening worktree
  -f, --force       Skip confirmation prompts`);
}
