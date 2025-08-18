// Tipos e interfaces para el sistema de servidores de Minecraft

/**
 * Datos base comunes para archivos y entidades del sistema
 */
export interface BaseFileData {
  name: string;
  path: string;
  size: number;
  lastModified?: Date;
  modified?: string;
  status?: string;
  version?: string;
  icon?: string;
}

/**
 * Información extendida de un archivo
 */
export interface FileInfo extends BaseFileData {
  extension: string;
  exists: boolean;
}

/**
 * Criterios de validación para archivos
 */
export interface FileValidationCriteria {
  requiredFiles?: string[];
  allowedExtensions?: string[];
  minSize?: number;
  maxSize?: number;
  contentPatterns?: string[];
  forbiddenPatterns?: string[];
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

/**
 * Tipos de servidor disponibles
 */
export type ServerType = 'vanilla' | 'forge' | 'fabric' | 'bukkit' | 'spigot' | 'paper' | 'unknown';

/**
 * Datos base de un servidor (sin anidación)
 */
export interface BaseServerData extends BaseFileData {
  id: string;
  folderName: string;
  serverType?: ServerType;
  description?: string;
  tags?: string[];
  lastBackup?: Date;
  playerCount?: number;
  worldSize?: number;
  totalSize?: number;
  plugins?: string[];
  mods?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Información completa de un servidor de Minecraft
 * Usa composición en lugar de anidación excesiva
 */
export interface MinecraftServerInfo extends BaseServerData {
  files: FileInfo[];
  validationResult: ValidationResult;
  isValid: boolean; // Propiedad directa para fácil acceso
  customData?: Record<string, any>;
}

/**
 * Opciones de filtrado para servidores
 */
export interface ServerFilterOptions {
  serverType?: ServerType[];
  hasRequiredFiles?: string[];
  minWorldSize?: number;
  maxWorldSize?: number;
  tags?: string[];
  validOnly?: boolean;
  customFilter?: (server: MinecraftServerInfo) => boolean;
}

/**
 * Configuración del mapeador de servidores
 */
export interface ServerMapperConfig {
  serversPath: string;
  validationCriteria: FileValidationCriteria;
  autoEnrichment: boolean;
  scanSubdirectories: boolean;
  excludePatterns?: string[];
}

/**
 * Resultado del mapeo de servidores
 */
export interface ServerMappingResult {
  servers: MinecraftServerInfo[];
  totalFound: number;
  validServers: number;
  invalidServers: number;
  errors: string[];
  scanDuration: number;
}