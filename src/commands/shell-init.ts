import { basename } from "path";

function detectShell(): string {
  const shell = process.env.SHELL || "";
  const name = basename(shell);
  if (["zsh", "bash", "fish"].includes(name)) return name;
  return "zsh";
}

export function cmdShellInit(): void {
  const shell = detectShell();

  if (shell === "fish") {
    console.log(fishWrapper());
  } else {
    console.log(posixWrapper(shell));
  }
}

function posixWrapper(shell: "zsh" | "bash"): string {
  return `unalias rift 2>/dev/null
function rift {
    local tmpdir="\${TMPDIR:-/tmp}"
    export RIFT_SHELL_PID=\$\$
    rm -f "\$tmpdir/.rift_cd_path_\$\$" "\$tmpdir/.rift_start_agent_\$\$"
    command rift "\$@"
    local rc=\$?
    if [[ -f "\$tmpdir/.rift_cd_path_\$\$" ]]; then
        local cd_path=\$(cat "\$tmpdir/.rift_cd_path_\$\$")
        rm -f "\$tmpdir/.rift_cd_path_\$\$"
        [[ -d "\$cd_path" ]] && cd "\$cd_path"
    fi
    if [[ -f "\$tmpdir/.rift_start_agent_\$\$" ]]; then
        rm -f "\$tmpdir/.rift_start_agent_\$\$"
        local agent_cmd=\$(command rift _agent-cmd 2>/dev/null)
        [[ -n "\$agent_cmd" ]] && \$agent_cmd
    fi
    return \$rc
}`;
}

function fishWrapper(): string {
  return `function rift
    set tmpdir (test -n "$TMPDIR" && echo "$TMPDIR" || echo "/tmp")
    set -x RIFT_SHELL_PID %self
    rm -f "$tmpdir/.rift_cd_path_$RIFT_SHELL_PID" "$tmpdir/.rift_start_agent_$RIFT_SHELL_PID"
    command rift $argv
    set rc $status
    if test -f "$tmpdir/.rift_cd_path_$RIFT_SHELL_PID"
        set cd_path (cat "$tmpdir/.rift_cd_path_$RIFT_SHELL_PID")
        rm -f "$tmpdir/.rift_cd_path_$RIFT_SHELL_PID"
        test -d "$cd_path" && cd "$cd_path"
    end
    if test -f "$tmpdir/.rift_start_agent_$RIFT_SHELL_PID"
        rm -f "$tmpdir/.rift_start_agent_$RIFT_SHELL_PID"
        set agent_cmd (command rift _agent-cmd 2>/dev/null)
        test -n "$agent_cmd" && eval $agent_cmd
    end
    return $rc
end`;
}
