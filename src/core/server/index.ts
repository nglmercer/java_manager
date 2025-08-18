/**
 * Módulo de gestión de servidores de Minecraft
 * 
 * Este módulo proporciona funcionalidades completas para:
 * - Mapeo y descubrimiento de carpetas de servidores
 * - Enriquecimiento de datos con información adicional
 * - Validación y filtrado con criterios personalizables
 * - Gestión persistente de datos
 */

import { MinecraftServerManager } from './serverFiles.js';


// Exportar tipos e interfaces principales
export type{
  FileInfo,
  FileValidationCriteria,
  ValidationResult,
  MinecraftServerInfo,
  ServerFilterOptions,
  ServerMapperConfig,
  ServerMappingResult
} from '../types/mcserver.js';

// Exportar clases principales
export { ServerValidator } from '../utils/validators.js';
export { ServerMapper } from './ServerMapper.js';
export { MinecraftServerManager, minecraftServerManager, serverMCStore } from './serverFiles.js';
const minecraftServerManager = new MinecraftServerManager();
// Exportar funciones de utilidad
export const ServerUtils = {
  /**
   * Formatea bytes en formato legible
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Valida si un nombre de archivo es válido para Minecraft
   */
  isValidMinecraftFile(filename: string): boolean {
    const validExtensions = ['.jar', '.properties', '.yml', '.yaml', '.json', '.txt', '.cfg', '.conf'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return validExtensions.includes(extension);
  },

  /**
   * Detecta si una carpeta parece ser un servidor de Minecraft
   */
  looksLikeMinecraftServer(files: string[]): boolean {
    const lowerFiles = files.map(f => f.toLowerCase());
    
    // Debe tener al menos un .jar y server.properties
    const hasJar = lowerFiles.some(f => f.endsWith('.jar'));
    const hasProperties = lowerFiles.includes('server.properties');
    
    return hasJar && hasProperties;
  },

  /**
   * Extrae información de versión de un nombre de archivo JAR
   */
  extractVersionFromJar(jarName: string): string | null {
    const versionPattern = /(\d+\.\d+(?:\.\d+)?(?:-\w+)?)/;
    const match = jarName.match(versionPattern);
    return match ? match[1] : null;
  },

  /**
   * Genera un resumen de un servidor
   */
  generateServerSummary(server: any): string {
    const type = server.enrichmentData?.serverType || 'unknown';
    const version = server.enrichmentData?.version || 'unknown';
    const valid = server.validationResult?.isValid ? '✅' : '❌';
    const worldSize = server.enrichmentData?.worldSize 
      ? ServerUtils.formatBytes(server.enrichmentData.worldSize)
      : 'unknown';
    
    return `${server.name} | ${type} ${version} | ${valid} | World: ${worldSize}`;
  }
};

// Configuraciones predefinidas comunes
export const CommonConfigurations = {
  /**
   * Configuración estricta para servidores de producción
   */
  PRODUCTION: {
    validationCriteria: {
      requiredFiles: ['server.jar', 'server.properties', 'eula.txt'],
      allowedExtensions: ['.jar', '.properties', '.yml', '.yaml', '.json', '.txt'],
      minSize: 1024,
      maxSize: 2 * 1024 * 1024 * 1024, // 2GB
      contentPatterns: ['eula=true'],
      forbiddenPatterns: ['password=', 'secret=', 'token=', 'key=']
    },
    autoEnrichment: true,
    scanSubdirectories: false,
    excludePatterns: ['temp*', 'backup*', '.*', 'logs', 'cache', 'crash-reports']
  },

  /**
   * Configuración permisiva para desarrollo
   */
  DEVELOPMENT: {
    validationCriteria: {
      requiredFiles: ['server.jar'],
      allowedExtensions: ['.jar', '.properties', '.yml', '.yaml', '.json', '.txt', '.cfg', '.conf'],
      minSize: 512,
      maxSize: 5 * 1024 * 1024 * 1024, // 5GB
      contentPatterns: [],
      forbiddenPatterns: []
    },
    autoEnrichment: true,
    scanSubdirectories: true,
    excludePatterns: ['temp*', '.*']
  },

  /**
   * Configuración básica para escaneo rápido
   */
  BASIC: {
    validationCriteria: {
      requiredFiles: [],
      allowedExtensions: [],
      minSize: 0,
      maxSize: Number.MAX_SAFE_INTEGER,
      contentPatterns: [],
      forbiddenPatterns: []
    },
    autoEnrichment: false,
    scanSubdirectories: true,
    excludePatterns: []
  }
};

// Filtros predefinidos comunes
export const CommonFilters = {
  /**
   * Solo servidores válidos
   */
  VALID_ONLY: {
    validOnly: true
  },

  /**
   * Servidores de producción (con tags específicos)
   */
  PRODUCTION_SERVERS: {
    validOnly: true,
    tags: ['production'],
    hasRequiredFiles: ['server.properties', 'eula.txt']
  },

  /**
   * Servidores con mundos grandes
   */
  LARGE_WORLDS: {
    minWorldSize: 100 * 1024 * 1024, // 100MB
    customFilter: (server: any) => (server.worldSize || 0) > 100 * 1024 * 1024
  },

  /**
   * Servidores modded (Forge/Fabric)
   */
  MODDED_SERVERS: {
    serverType: ['forge', 'fabric'],
    customFilter: (server: any) => {
      const mods = server.mods || [];
      return mods.length > 0;
    }
  },

  /**
   * Servidores con plugins
   */
  PLUGIN_SERVERS: {
    serverType: ['bukkit', 'spigot', 'paper'],
    customFilter: (server: any) => {
      const plugins = server.plugins || [];
      return plugins.length > 0;
    }
  }
};

/**
 * Función de conveniencia para inicializar rápidamente el sistema
 */
export async function quickStart(configName?: keyof typeof CommonConfigurations) {
  const config = configName ? CommonConfigurations[configName] : CommonConfigurations.DEVELOPMENT;
  
  // Inicializar el sistema
  await minecraftServerManager.initialize();
  
  // Aplicar configuración si se especifica
  if (configName) {
    await minecraftServerManager.importConfig({
      ...config,
      autoScanInterval: 3600000 // 1 hora por defecto
    });
  }
  
  // Realizar escaneo inicial
  const servers = await minecraftServerManager.scanAndMapServers();
  
  return {
    manager: minecraftServerManager,
    servers,
    stats: await minecraftServerManager.getServerStats()
  };
}

/**
 * Función para generar un reporte completo del sistema
 */
export async function generateSystemReport() {
  const servers = await minecraftServerManager.getAllServers();
  const stats = await minecraftServerManager.getServerStats();
  const config = await minecraftServerManager.exportConfig();
  
  return {
    timestamp: new Date(),
    summary: {
      totalServers: stats.total,
      validServers: stats.valid,
      invalidServers: stats.invalid,
      totalWorldSize: ServerUtils.formatBytes(stats.totalWorldSize),
      averageWorldSize: ServerUtils.formatBytes(stats.averageWorldSize)
    },
    serversByType: stats.byType,
    servers: servers.map(server => ({
      id: server.id,
      name: server.name,
      type: server.serverType || 'unknown',
      version: server.version || 'unknown',
      valid: server.isValid,
      worldSize: ServerUtils.formatBytes(server.worldSize || 0),
      plugins: server.plugins?.length || 0,
      mods: server.mods?.length || 0,
      tags: server.tags || [],
      lastUpdated: server.updatedAt
    })),
    configuration: config
  };
}