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
    rm -f "\$tmpdir/.rift_cd_path" "\$tmpdir/.rift_start_agent"
    command rift "\$@"
    local rc=\$?
    if [[ -f "\$tmpdir/.rift_cd_path" ]]; then
        local cd_path=\$(cat "\$tmpdir/.rift_cd_path")
        rm -f "\$tmpdir/.rift_cd_path"
        [[ -d "\$cd_path" ]] && cd "\$cd_path"
    fi
    if [[ -f "\$tmpdir/.rift_start_agent" ]]; then
        rm -f "\$tmpdir/.rift_start_agent"
        local agent_cmd=\$(command rift _agent-cmd 2>/dev/null)
        [[ -n "\$agent_cmd" ]] && \$agent_cmd
    fi
    return \$rc
}`;
}

function fishWrapper(): string {
  return `function rift
    set tmpdir (test -n "$TMPDIR" && echo "$TMPDIR" || echo "/tmp")
    rm -f "$tmpdir/.rift_cd_path" "$tmpdir/.rift_start_agent"
    command rift $argv
    set rc $status
    if test -f "$tmpdir/.rift_cd_path"
        set cd_path (cat "$tmpdir/.rift_cd_path")
        rm -f "$tmpdir/.rift_cd_path"
        test -d "$cd_path" && cd "$cd_path"
    end
    if test -f "$tmpdir/.rift_start_agent"
        rm -f "$tmpdir/.rift_start_agent"
        set agent_cmd (command rift _agent-cmd 2>/dev/null)
        test -n "$agent_cmd" && eval $agent_cmd
    end
    return $rc
end`;
}
