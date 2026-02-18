export interface RiftConfig {
  editor?: string;
  agent?: string;
  hooks?: {
    open?: string;
    jump?: string;
    close?: string;
    purge?: string;
  };
}

export interface GlobalConfig {
  agent?: string;
  editor?: string;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
}

export interface Editor {
  name: string;
  cmd: string;
  managedWorkspace: boolean;
}

export interface AgentRegistration {
  shellPid: number;
  agentPid: number;
  mainWorktreePath: string;
}
