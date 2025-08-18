export interface ServerConfig {
  stopCommand?: string;
  serveractions?: string[];
  fileactions?: string[];
  onerror?: string;
  periodicallyrestart?: boolean;
  periodicallybackup?: boolean;
  timeout?: {
    restart: number;
    backup: number;
  };
}

export interface ServerMetrics {
  serverName: string;
  players: number;
  tps: number;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
  status: ServerStatus;
}

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

export interface PlayerInfo {
  name: string;
  joinTime?: number;
}

export interface ServerEvents {
  'server:start': (serverName: string) => void;
  'server:stop': (serverName: string) => void;
  'server:close': (serverName: string, code: number) => void;
  'server:error': (serverName: string, error: string) => void;
  'server:output': (serverName: string, data: string) => void;
  'server:playerJoin': (serverName: string, player: string) => void;
  'server:playerLeave': (serverName: string, player: string) => void;
  'server:command': (serverName: string, command: string) => void;
}