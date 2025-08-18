import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import treekill from 'tree-kill';
import { emitter } from '../../Emitter.js';
import type{ ServerConfig, ServerStatus, ServerMetrics } from './types.js';

export class MinecraftServer {
  private process: ChildProcess | null = null;
  private _startTime: number | null = null;
  private players = new Set<string>();
  private tps = 0;
  private uptime = 0;
  private cpuUsage = 0;
  private memoryUsage = 0;

  constructor(
    public readonly serverName: string,
    public readonly serverFolderPath: string,
    private config: ServerConfig = {}
  ) {
    this.serverFolderPath = path.resolve(serverFolderPath);
  }

  public status: ServerStatus = 'stopped';

  private getStartFilePath(): string {
    const startFile = process.platform === 'win32' ? 'start.bat' : 'start.sh';
    return path.join(this.serverFolderPath, startFile);
  }

  private updateUptime(): void {
    if (this.status === 'running' && this._startTime) {
      this.uptime = Math.floor((Date.now() - this._startTime) / 1000);
    }
  }

  start(): void {
    if (this.status !== 'stopped') return;

    const startScript = this.getStartFilePath();
    if (!fs.existsSync(startScript)) {
      emitter.emit('server:error', this.serverName, `Start script not found: ${startScript}`);
      return;
    }

    this.status = 'starting';
    this._startTime = Date.now();

    const command = process.platform === 'win32' ? startScript : 'sh';
    const args = process.platform === 'win32' ? [] : [startScript];

    this.process = spawn(command, args, {
      cwd: this.serverFolderPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.attachProcessListeners();
    this.status = 'running';
    emitter.emit('server:start', this.serverName);
  }

  private attachProcessListeners(): void {
    if (!this.process) return;

    this.process.stdout?.setEncoding('utf8');
    this.process.stderr?.setEncoding('utf8');

    this.process.stdout?.on('data', (data: string) => {
      this.handleOutput(data);
    });

    this.process.stderr?.on('data', (data: string) => {
      this.handleOutput(data);
    });

    this.process.on('close', (code) => {
      this.status = 'stopped';
      this._startTime = null;
      this.uptime = 0;
      this.cpuUsage = 0;
      this.memoryUsage = 0;
      emitter.emit('server:close', this.serverName, code || 0);
    });

    this.process.on('error', (err) => {
      this.status = 'stopped';
      emitter.emit('server:error', this.serverName, err.message);
    });
  }

  private handleOutput(data: string): void {
    if (typeof data !== 'string') return;

    emitter.emit('server:output', this.serverName, data);

    const joinMatch = data.match(/(\w+) joined the game/);
    if (joinMatch?.[1]) {
      this.players.add(joinMatch[1]);
      emitter.emit('server:playerJoin', this.serverName, joinMatch[1]);
    }

    const leaveMatch = data.match(/(\w+) left the game/);
    if (leaveMatch?.[1]) {
      this.players.delete(leaveMatch[1]);
      emitter.emit('server:playerLeave', this.serverName, leaveMatch[1]);
    }

    const listMatch = data.match(/There are (\d+) of a max of \d+ players online:(.*)/);
    if (listMatch) {
      this.players.clear();
      if (listMatch[2]?.trim()) {
        const playerNames = listMatch[2].trim().split(/,\s*/).map(name => name.trim());
        playerNames.forEach(player => {
          if (player) this.players.add(player);
        });
      }
    }

    const tpsPatterns = [
      /TPS from last 1m, 5m, 15m: (\d+\.?\d*)/,
      /Current TPS = (\d+\.?\d*)/,
      /TPS: (\d+\.?\d*)/
    ];

    for (const pattern of tpsPatterns) {
      const tpsMatch = data.match(pattern);
      if (tpsMatch?.[1]) {
        const newTps = parseFloat(tpsMatch[1]);
        if (!isNaN(newTps)) {
          this.tps = newTps;
          break;
        }
      }
    }
  }

  sendCommand(command: string): void {
    emitter.emit('server:command', this.serverName, command);
    if (this.process?.stdin?.writable) {
      this.process.stdin.write(command + '\n');
    }
  }

  stop(): void {
    if (this.process && this.status === 'running') {
      this.sendCommand(this.config.stopCommand || 'stop');
      this.status = 'stopping';
    }
  }

  kill(): void {
    if (this.process?.pid) {
      treekill(this.process.pid, () => {
        this.status = 'stopped';
        this._startTime = null;
        this.uptime = 0;
        this.cpuUsage = 0;
        this.memoryUsage = 0;
      });
    } else {
      this.status = 'stopped';
    }
  }

  getOnlinePlayers(): string[] {
    return Array.from(this.players);
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getServerMetrics(): ServerMetrics {
    this.updateUptime();
    return {
      serverName: this.serverName,
      players: this.getPlayerCount(),
      tps: this.tps,
      memoryUsage: this.memoryUsage,
      cpuUsage: this.cpuUsage,
      uptime: this.uptime,
      status: this.status
    };
  }

  getStatus(): ServerStatus {
    return this.status;
  }
}