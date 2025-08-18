import { defaultPaths } from "../../config.js";
import { DataStorage } from "json-obj-manager";
import { JSONFileAdapter } from "json-obj-manager/node";
import path from "path";
import fs from 'fs';
import { ServerMapper } from './ServerMapper.js';
import { serverManager } from '../mc/ServerManager.js';

//const { serverManager } = require('../mc/ServerManager.js');

import type{
  MinecraftServerInfo,
  ServerFilterOptions,
  ServerMapperConfig,
  FileValidationCriteria
} from '../types/mcserver.js';

// Configuración del almacenamiento de datos
const serverMCStore = new DataStorage<any>(
  new JSONFileAdapter(
    path.join(defaultPaths.serversPath, 'servers.json')
  )
);

/**
 * Clase principal para gestionar servidores de Minecraft
 */
export class MinecraftServerManager {
  private serverMapper: ServerMapper;
  private dataStore: DataStorage<any>;
  public data: any;

  constructor() {
    this.dataStore = serverMCStore;
    
    // Configuración por defecto del mapeador
    const defaultConfig: ServerMapperConfig = {
      serversPath: defaultPaths.serversPath,
      validationCriteria: this.getDefaultValidationCriteria(),
      autoEnrichment: true,
      scanSubdirectories: true,
      excludePatterns: ['backup*', '.*', 'logs', 'cache', 'crash-reports']
    };
    
    this.serverMapper = new ServerMapper(defaultConfig);
  }

  /**
   * Inicializa el sistema de gestión de servidores
   */
  async initialize(): Promise<void> {
    try {
      // Crear estructura inicial si no existe
      if (!await this.dataStore.load('servers')) {
        await this.dataStore.save('servers', []);
      }
      if (!await this.dataStore.load('config')) {
        await this.dataStore.save('config', this.getDefaultConfig());
      }
      
      console.log('Sistema de gestión de servidores inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando el sistema:', error);
      throw error;
    }
  }

  /**
   * Escanea y mapea todos los servidores
   */
  async scanAndMapServers(): Promise<MinecraftServerInfo[]> {
    try {
      const mappingResult = await this.serverMapper.mapServers();
      
      // Guardar los servidores encontrados
      await this.dataStore.save('servers', mappingResult.servers);
      await this.dataStore.save('lastScan', {
        timestamp: new Date(),
        result: mappingResult
      });
      
      console.log(`Escaneo completado: ${mappingResult.totalFound} carpetas encontradas, ${mappingResult.validServers} servidores válidos`);
      
      if (mappingResult.errors.length > 0) {
        console.warn('Errores durante el escaneo:', mappingResult.errors);
      }
      
      return mappingResult.servers;
    } catch (error) {
      console.error('Error durante el escaneo de servidores:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los servidores almacenados
   */
  async getAllServers(): Promise<MinecraftServerInfo[]> {
    try {
      return await this.dataStore.load('servers') || [];
    } catch (error) {
      console.error('Error obteniendo servidores:', error);
      return [];
    }
  }

  /**
   * Filtra servidores según criterios específicos
   */
  async filterServers(options: ServerFilterOptions): Promise<MinecraftServerInfo[]> {
    const servers = await this.getAllServers();
    return this.serverMapper.filterServers(servers, options);
  }

  /**
   * Obtiene un servidor por ID
   */
  async getServerById(serverId: string): Promise<MinecraftServerInfo | null> {
    const servers = await this.getAllServers();
    return servers.find(s => s.id === serverId) || null;
  }
  /**
   * Obtiene un servidor por nombre
   */
  async getServerByName(serverName: string): Promise<MinecraftServerInfo | null> {
    const servers = await this.getAllServers();
    return servers.find(s => s.name === serverName) || null;
  }

  /**
   * Actualiza los datos de un servidor
   */
  async updateServerData(serverId: string, serverData: Partial<MinecraftServerInfo>): Promise<boolean> {
    try {
      const servers = await this.getAllServers();
      const success = this.serverMapper.updateServerData(serverId, servers, serverData);
      
      if (success) {
        await this.dataStore.save('servers', servers);
      }
      
      return success;
    } catch (error) {
      console.error('Error actualizando datos del servidor:', error);
      return false;
    }
  }

  /**
   * Añade tags a un servidor
   */
  async addServerTags(serverId: string, tags: string[]): Promise<boolean> {
    try {
      const servers = await this.getAllServers();
      const success = this.serverMapper.addServerTags(serverId, servers, tags);
      
      if (success) {
        await this.dataStore.save('servers', servers);
      }
      
      return success;
    } catch (error) {
      console.error('Error añadiendo tags al servidor:', error);
      return false;
    }
  }

  /**
   * Remueve tags de un servidor
   */
  async removeServerTags(serverId: string, tags: string[]): Promise<boolean> {
    try {
      const servers = await this.getAllServers();
      const success = this.serverMapper.removeServerTags(serverId, servers, tags);
      
      if (success) {
        await this.dataStore.save('servers', servers);
      }
      
      return success;
    } catch (error) {
      console.error('Error removiendo tags del servidor:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas de los servidores
   */
  async getServerStats(): Promise<any> {
    const servers = await this.getAllServers();
    const stats = {
      total: servers.length,
      valid: servers.filter(s => s.isValid).length,
      invalid: servers.filter(s => !s.isValid).length,
      byType: {} as Record<string, number>,
      totalWorldSize: 0,
      averageWorldSize: 0
    };

    // Estadísticas por tipo
    servers.forEach(server => {
      const type = server.serverType || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.totalWorldSize += server.worldSize || 0;
    });

    stats.averageWorldSize = servers.length > 0 ? stats.totalWorldSize / servers.length : 0;

    return stats;
  }

  /**
   * Exporta la configuración actual
   */
  async exportConfig(): Promise<any> {
    return await this.dataStore.load('config');
  }

  /**
   * Importa una nueva configuración
   */
  async importConfig(config: any): Promise<void> {
    await this.dataStore.save('config', config);
    // Actualizar la configuración del ServerMapper
    await this.updateServerMapperConfig(config);
  }

  /**
   * Actualiza la configuración del ServerMapper
   */
  private async updateServerMapperConfig(newConfig: any): Promise<void> {
    const currentConfig = await this.exportConfig();
    const mergedConfig = { ...currentConfig, ...newConfig };
    
    // Crear un nuevo ServerMapper con la configuración actualizada
    const fullConfig: ServerMapperConfig = {
      serversPath: defaultPaths.serversPath,
      excludePatterns: mergedConfig.excludePatterns || this.getDefaultConfig().excludePatterns,
      scanSubdirectories: mergedConfig.scanSubdirectories ?? true,
      autoEnrichment: mergedConfig.autoEnrichment ?? true,
      validationCriteria: mergedConfig.validationCriteria || this.getDefaultValidationCriteria()
    };
    
    this.serverMapper = new ServerMapper(fullConfig);
  }

  /**
   * Obtiene los criterios de validación por defecto
   */
  private getDefaultValidationCriteria(): FileValidationCriteria {
    return {
      requiredFiles: [], // Removemos archivos específicos requeridos para ser más flexibles
      allowedExtensions: ['.jar', '.properties', '.yml', '.yaml', '.json', '.txt', '.cfg', '.conf', '.toml', '.log'],
      minSize: 100, // 100 bytes mínimo (más permisivo)
      maxSize: 2 * 1024 * 1024 * 1024, // 2GB máximo
      contentPatterns: [],
      forbiddenPatterns: ['password=', 'secret=']
    };
  }

  /**
   * Obtiene la configuración por defecto del sistema
   */
  private getDefaultConfig(): any {
    return {
      autoScanInterval: 3600000, // 1 hora en milisegundos
      enableAutoEnrichment: true,
      scanSubdirectories: true,
      excludePatterns: ['backup*', '.*', 'logs', 'cache', 'crash-reports'],
      validationCriteria: this.getDefaultValidationCriteria()
    };
  }
  getServerMapper(){
    return this.serverMapper;
  }

  // Métodos de control de servidores usando ServerManager
  private serverManager: any;

  private getServerManager(): typeof serverManager {
    if (!this.serverManager) {
      // Importación dinámica para evitar dependencias circulares
      this.serverManager = serverManager;
    }
    return this.serverManager;
  }

  /**
   * Inicia un servidor
   */
  startServer(serverName: string): boolean {
    const manager = this.getServerManager();
    return manager.startServer(serverName);
  }

  /**
   * Detiene un servidor
   */
  stopServer(serverName: string): boolean {
    const manager = this.getServerManager();
    return manager.stopServer(serverName);
  }

  /**
   * Reinicia un servidor
   */
  restartServer(serverName: string): boolean {
    const manager = this.getServerManager();
    return manager.restartServer(serverName);
  }

  /**
   * Termina forzosamente un servidor
   */
  killServer(serverName: string): boolean {
    const manager = this.getServerManager();
    return manager.killServer(serverName);
  }

  /**
   * Envía un comando a un servidor
   */
  sendCommand(serverName: string, command: string): boolean {
    const manager = this.getServerManager();
    return manager.sendCommand(serverName, command);
  }

  /**
   * Obtiene los logs de un servidor
   */
  getServerLogs(serverName: string, lines?: number): string[] {
    const manager = this.getServerManager();
    return manager.getServerLogs(serverName, lines);
  }

  /**
   * Limpia los logs de un servidor
   */
  clearServerLogs(serverName: string): boolean {
    const manager = this.getServerManager();
    return manager.clearServerLogs(serverName);
  }

  /**
   * Obtiene las métricas de un servidor
   */
  getServerMetrics(serverName: string): any {
    const manager = this.getServerManager();
    return manager.getServerMetrics(serverName);
  }
  getServerStatus(serverName: string): any {
    const manager = this.getServerManager();
    return manager.getServerStatus(serverName);
  }
  /**
   * Agrega un servidor al manager de control
   */
  async addServerToManager(serverInfo: MinecraftServerInfo): Promise<boolean> {
    try {
      const manager = this.getServerManager();
      manager.addServer(serverInfo.name, serverInfo.path);
      return true;
    } catch (error) {
      console.error('Error agregando servidor al manager:', error);
      return false;
    }
  }

  /**
   * Inicializa todos los servidores encontrados en el manager de control
   */
  async initializeServersInManager(): Promise<void> {
    try {
      const servers = await this.getAllServers();
      const manager = this.getServerManager();
      
      for (const server of servers) {
        if (server.isValid) {
          manager.addServer(server.name, server.path);
        }
      }
      
      console.log(`${servers.filter(s => s.isValid).length} servidores agregados al manager de control`);
    } catch (error) {
      console.error('Error inicializando servidores en el manager:', error);
    }
  }
}

// Instancia global del gestor
export const minecraftServerManager = new MinecraftServerManager();

// Exportar también el store original para compatibilidad
export { serverMCStore };
