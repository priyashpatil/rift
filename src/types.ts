export interface RiftConfig {
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
}

export interface WorktreeInfo {
  path: string;
  branch: string;
}

export interface AgentRegistration {
  shellPid: number;
  agentPid: number;
  mainWorktreePath: string;
}
