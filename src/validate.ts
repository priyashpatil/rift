/**
 * Input validation for CLI arguments to prevent command injection (CWE-78).
 *
 * Even though Bun.spawn() with array form doesn't invoke a shell, we validate
 * inputs to prevent git flag injection and ensure safe use in env vars/paths.
 */

const SAFE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

export function validateWorktreeName(name: string): void {
  if (!name || name.length > 200) {
    throw new Error("Worktree name must be between 1 and 200 characters");
  }
  if (name.startsWith("-")) {
    throw new Error(`Invalid worktree name "${name}": must not start with "-"`);
  }
  if (!SAFE_NAME_RE.test(name)) {
    throw new Error(
      `Invalid worktree name "${name}": only alphanumeric characters, dots, hyphens, underscores, and slashes are allowed`,
    );
  }
}

export function validateBranchName(branch: string): void {
  if (!branch || branch.length > 200) {
    throw new Error("Branch name must be between 1 and 200 characters");
  }
  if (branch.startsWith("-")) {
    throw new Error(`Invalid branch name "${branch}": must not start with "-"`);
  }
  if (!SAFE_NAME_RE.test(branch)) {
    throw new Error(
      `Invalid branch name "${branch}": only alphanumeric characters, dots, hyphens, underscores, and slashes are allowed`,
    );
  }
}
