import { emitter } from '../../Emitter.js';
import { MinecraftServer } from './MinecraftServer.js';
import type{ ServerConfig, ServerMetrics } from '../types/mcserverconfig.js';

export class ServerManager {
  private servers = new Map<string, MinecraftServer>();

  addServer(serverName: string, serverFolderPath: string, config: ServerConfig = {}): MinecraftServer {
    if (this.servers.has(serverName)) {
      return this.servers.get(serverName)!;
    }

    const server = new MinecraftServer(serverName, serverFolderPath, config);
    this.servers.set(serverName, server);
    emitter.emit('server:add', serverName);
    return server;
  }

  removeServer(serverName: string): boolean {
    const server = this.servers.get(serverName);
    if (!server) return false;

    if (server.status !== 'stopped') {
      server.kill();
    }
    
    this.servers.delete(serverName);
    emitter.emit('server:remove', serverName);
    return true;
  }

  startServer(serverName: string): boolean {
    const server = this.servers.get(serverName);
    if (!server) return false;
    
    server.start();
    return true;
  }

  stopServer(serverName: string): boolean {
    const server = this.servers.get(serverName);
    if (!server) return false;
    
    server.stop();
    return true;
  }

  killServer(serverName: string): boolean {
    const server = this.servers.get(serverName);
    if (!server) return false;
    
    server.kill();
    return true;
  }

  sendCommand(serverName: string, command: string): boolean {
    const server = this.servers.get(serverName);
    if (!server) return false;
    
    server.sendCommand(command);
    return true;
  }

  getServerStatus(serverName: string): string | null {
    const server = this.servers.get(serverName);
    return server ? server.getStatus() : null;
  }

  getServerPlayers(serverName: string): string[] {
    const server = this.servers.get(serverName);
    return server ? server.getOnlinePlayers() : [];
  }

  getServerMetrics(serverName: string): ServerMetrics | null {
    const server = this.servers.get(serverName);
    return server ? server.getServerMetrics() : null;
  }

  getAllServersMetrics(): Record<string, ServerMetrics> {
    const metrics: Record<string, ServerMetrics> = {};
    this.servers.forEach((server, name) => {
      metrics[name] = server.getServerMetrics();
    });
    return metrics;
  }

  getAllServers(): MinecraftServer[] {
    return Array.from(this.servers.values());
  }

  getServerNames(): string[] {
    return Array.from(this.servers.keys());
  }

  hasServer(serverName: string): boolean {
    return this.servers.has(serverName);
  }

  getServerCount(): number {
    return this.servers.size;
  }

  restartServer(serverName: string): boolean {
    const server = this.servers.get(serverName);
    if (!server) return false;
    
    server.restart();
    return true;
  }

  getServerLogs(serverName: string, lines?: number): string[] {
    const server = this.servers.get(serverName);
    return server ? server.getLogs(lines) : [];
  }

  clearServerLogs(serverName: string): boolean {
    const server = this.servers.get(serverName);
    if (!server) return false;
    
    server.clearLogs();
    return true;
  }
}

export const serverManager = new ServerManager();