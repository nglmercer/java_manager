import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type{
  MinecraftServerInfo,
  ServerFilterOptions,
  ServerMapperConfig,
  ServerMappingResult,
  FileValidationCriteria,
  ServerType
} from '../types/mcserver.js';
import { ServerValidator } from '../utils/validators.js';

/**
 * Clase principal para mapear, enriquecer y validar servidores de Minecraft
 */
export class ServerMapper {
  private config: ServerMapperConfig;

  constructor(config: ServerMapperConfig) {
    this.config = config;
  }

  /**
   * Mapea todas las carpetas de servidores en el directorio especificado
   */
  async mapServers(): Promise<ServerMappingResult> {
    const startTime = Date.now();
    const result: ServerMappingResult = {
      servers: [],
      totalFound: 0,
      validServers: 0,
      invalidServers: 0,
      errors: [],
      scanDuration: 0
    };

    try {
      // Verificar que el directorio de servidores existe
      if (!fs.existsSync(this.config.serversPath)) {
        fs.mkdirSync(this.config.serversPath, { recursive: true });
      }

      const serverFolders = await this.findServerFolders();
      result.totalFound = serverFolders.length;

      for (const folderPath of serverFolders) {
        try {
          const serverInfo = await this.processServerFolder(folderPath);
          if (serverInfo) {
            result.servers.push(serverInfo);
            if (serverInfo.validationResult.isValid) {
              result.validServers++;
            } else {
              result.invalidServers++;
            }
          }
        } catch (error) {
          result.errors.push(`Error procesando ${folderPath}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          result.invalidServers++;
        }
      }

    } catch (error) {
      result.errors.push(`Error durante el mapeo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    result.scanDuration = Date.now() - startTime;
    return result;
  }

  /**
   * Encuentra todas las carpetas que podrían contener servidores
   */
  private async findServerFolders(): Promise<string[]> {
    const folders: string[] = [];
    
    try {
      const entries = fs.readdirSync(this.config.serversPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderPath = path.join(this.config.serversPath, entry.name);
          
          // Verificar si debe excluirse
          if (this.shouldExcludeFolder(entry.name)) {
            continue;
          }

          folders.push(folderPath);

          // Buscar en subdirectorios si está habilitado
          if (this.config.scanSubdirectories) {
            const subFolders = await this.findSubFolders(folderPath);
            folders.push(...subFolders);
          }
        }
      }
    } catch (error) {
      console.error('Error buscando carpetas de servidores:', error);
    }

    return folders;
  }

  /**
   * Busca subcarpetas recursivamente
   */
  private async findSubFolders(parentPath: string): Promise<string[]> {
    const subFolders: string[] = [];
    
    try {
      const entries = fs.readdirSync(parentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subFolderPath = path.join(parentPath, entry.name);
          
          if (!this.shouldExcludeFolder(entry.name)) {
            subFolders.push(subFolderPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error buscando subcarpetas en ${parentPath}:`, error);
    }

    return subFolders;
  }

  /**
   * Verifica si una carpeta debe ser excluida
   */
  private shouldExcludeFolder(folderName: string): boolean {
    // Carpetas comunes que nunca son servidores de Minecraft
    const commonExclusions = [
      'world', 'world_nether', 'world_the_end', // Mundos
      'plugins', 'mods', 'config', 'configs', // Contenido del servidor
      'logs', 'crash-reports', 'cache', // Archivos temporales
      'libraries', 'versions', 'assets', // Launcher/cliente
      'saves', 'screenshots', 'resourcepacks', 'shaderpacks', // Cliente
      'backups', 'backup', 'temp', 'tmp', // Temporales
      'bin', 'lib', 'data', 'work' // Sistema
    ];
    
    // Verificar exclusiones comunes primero
    if (commonExclusions.includes(folderName.toLowerCase())) {
      return true;
    }
    
    // Verificar patrones de configuración
    if (!this.config.excludePatterns) return false;
    
    return this.config.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Convertir patrón de glob a regex
        let regexPattern = pattern
          .replace(/\./g, '\\.') // Escapar puntos literales
          .replace(/\*/g, '.*');   // Convertir * a .*
        
        // Si el patrón es solo '.*', debería ser '^\.' para archivos ocultos
        if (pattern === '.*') {
          regexPattern = '^\\.'; // Archivos/carpetas que empiecen con punto
        }
        
        const regex = new RegExp(regexPattern);
        return regex.test(folderName);
      }
      return folderName.includes(pattern);
    });
  }

  /**
   * Procesa una carpeta individual de servidor
   */
  private async processServerFolder(folderPath: string): Promise<MinecraftServerInfo | null> {
    try {
      const folderName = path.basename(folderPath);
      const validationResult = await ServerValidator.validateServerFolder(
        folderPath,
        this.config.validationCriteria
      );

      // Obtener información de archivos
      const files = validationResult.details.files || [];

      // Crear datos base del servidor
      const baseData = {
        id: uuidv4(),
        name: folderName,
        path: folderPath,
        folderName,
        size: 0, // Se calculará en el enriquecimiento
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Enriquecer datos automáticamente si está habilitado
      let enrichedData = {};
      if (this.config.autoEnrichment) {
        enrichedData = await this.autoEnrichServerData(folderPath, files);
      }

      const serverInfo: MinecraftServerInfo = {
        ...baseData,
        ...enrichedData,
        files,
        validationResult,
        isValid: validationResult.isValid
      };

      return serverInfo;
    } catch (error) {
      console.error(`Error procesando servidor en ${folderPath}:`, error);
      return null;
    }
  }

  /**
   * Enriquece automáticamente los datos del servidor
   */
  private async autoEnrichServerData(folderPath: string, files: any[]): Promise<Partial<MinecraftServerInfo>> {
    const enrichedData: Partial<MinecraftServerInfo> = {
      customData: {}
    };

    try {
      // Detectar tipo de servidor
      enrichedData.serverType = ServerValidator.detectServerType(files) as ServerType;

      // Extraer versión
      enrichedData.version = ServerValidator.extractServerVersion(files);

      // Calcular tamaño del mundo
      enrichedData.worldSize = await this.calculateWorldSize(folderPath);

      // Calcular tamaño total de la carpeta del servidor (actualizar size base)
      enrichedData.totalSize = await this.getFolderSize(folderPath);
      enrichedData.size = enrichedData.totalSize; // Actualizar el size base

      // Detectar plugins/mods
      enrichedData.plugins = this.detectPlugins(folderPath);
      enrichedData.mods = this.detectMods(folderPath);

      // Leer configuraciones adicionales
      await this.readServerProperties(folderPath, enrichedData);

    } catch (error) {
      console.error('Error durante el enriquecimiento automático:', error);
    }

    return enrichedData;
  }

  /**
   * Calcula el tamaño del mundo del servidor
   */
  private async calculateWorldSize(folderPath: string): Promise<number> {
    let totalSize = 0;
    const worldFolders = ['world', 'world_nether', 'world_the_end'];

    for (const worldFolder of worldFolders) {
      const worldPath = path.join(folderPath, worldFolder);
      if (fs.existsSync(worldPath)) {
        totalSize += await this.getFolderSize(worldPath);
      }
    }

    return totalSize;
  }

  /**
   * Calcula el tamaño de una carpeta recursivamente
   */
  private async getFolderSize(folderPath: string): Promise<number> {
    let size = 0;
    
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(folderPath, entry.name);
        
        if (entry.isFile()) {
          const stats = fs.statSync(entryPath);
          size += stats.size;
        } else if (entry.isDirectory()) {
          size += await this.getFolderSize(entryPath);
        }
      }
    } catch (error) {
      console.error(`Error calculando tamaño de ${folderPath}:`, error);
    }

    return size;
  }

  /**
   * Detecta plugins en la carpeta plugins
   */
  private detectPlugins(folderPath: string): string[] {
    const pluginsPath = path.join(folderPath, 'plugins');
    if (!fs.existsSync(pluginsPath)) return [];

    try {
      return fs.readdirSync(pluginsPath)
        .filter(file => file.endsWith('.jar'))
        .map(file => path.basename(file, '.jar'));
    } catch (error) {
      console.error('Error detectando plugins:', error);
      return [];
    }
  }

  /**
   * Detecta mods en la carpeta mods
   */
  private detectMods(folderPath: string): string[] {
    const modsPath = path.join(folderPath, 'mods');
    if (!fs.existsSync(modsPath)) return [];

    try {
      return fs.readdirSync(modsPath)
        .filter(file => file.endsWith('.jar'))
        .map(file => path.basename(file, '.jar'));
    } catch (error) {
      console.error('Error detectando mods:', error);
      return [];
    }
  }

  /**
   * Lee las propiedades del servidor desde server.properties
   */
  private async readServerProperties(folderPath: string, enrichedData: Partial<MinecraftServerInfo>): Promise<void> {
    const propsPath = path.join(folderPath, 'server.properties');
    if (!fs.existsSync(propsPath)) return;

    try {
      const content = fs.readFileSync(propsPath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const [key, value] = line.split('=').map(s => s.trim());
        if (key && value) {
          if (key === 'max-players') {
            enrichedData.playerCount = parseInt(value) || 0;
          } else if (key === 'motd') {
            enrichedData.description = value.replace(/§[0-9a-fk-or]/g, ''); // Remover códigos de color
          }
        }
      }
    } catch (error) {
      console.error('Error leyendo server.properties:', error);
    }
  }

  /**
   * Filtra servidores según los criterios especificados
   */
  filterServers(servers: MinecraftServerInfo[], options: ServerFilterOptions): MinecraftServerInfo[] {
    return servers.filter(server => {
      // Filtrar por tipo de servidor
      if (options.serverType && options.serverType.length > 0) {
        if (!options.serverType.includes(server.serverType || 'unknown')) {
          return false;
        }
      }

      // Filtrar por archivos requeridos
      if (options.hasRequiredFiles && options.hasRequiredFiles.length > 0) {
        const fileNames = server.files.map(f => f.name.toLowerCase());
        const hasAllRequired = options.hasRequiredFiles.every(required => 
          fileNames.includes(required.toLowerCase())
        );
        if (!hasAllRequired) return false;
      }

      // Filtrar por tamaño del mundo
      if (options.minWorldSize !== undefined) {
        if ((server.worldSize || 0) < options.minWorldSize) {
          return false;
        }
      }
      if (options.maxWorldSize !== undefined) {
        if ((server.worldSize || 0) > options.maxWorldSize) {
          return false;
        }
      }

      // Filtrar por tags
      if (options.tags && options.tags.length > 0) {
        const serverTags = server.tags || [];
        const hasAnyTag = options.tags.some(tag => serverTags.includes(tag));
        if (!hasAnyTag) return false;
      }

      // Filtrar solo válidos
      if (options.validOnly && !server.validationResult.isValid) {
        return false;
      }

      // Filtro personalizado
      if (options.customFilter && !options.customFilter(server)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Actualiza los datos de un servidor
   */
  updateServerData(serverId: string, servers: MinecraftServerInfo[], newData: Partial<MinecraftServerInfo>): boolean {
    const server = servers.find(s => s.id === serverId);
    if (!server) return false;

    Object.assign(server, newData);
    server.updatedAt = new Date();
    return true;
  }

  /**
   * Añade tags a un servidor
   */
  addServerTags(serverId: string, servers: MinecraftServerInfo[], tags: string[]): boolean {
    const server = servers.find(s => s.id === serverId);
    if (!server) return false;

    const currentTags = server.tags || [];
    const newTags = [...new Set([...currentTags, ...tags])];
    server.tags = newTags;
    server.updatedAt = new Date();
    return true;
  }

  /**
   * Remueve tags de un servidor
   */
  removeServerTags(serverId: string, servers: MinecraftServerInfo[], tags: string[]): boolean {
    const server = servers.find(s => s.id === serverId);
    if (!server) return false;

    const currentTags = server.tags || [];
    server.tags = currentTags.filter(tag => !tags.includes(tag));
    server.updatedAt = new Date();
    return true;
  }
}