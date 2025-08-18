import fs from 'fs';
import path from 'path';
import type{ FileInfo, FileValidationCriteria, ValidationResult } from '../types/mcserver.js';

/**
 * Clase para validar archivos y carpetas de servidores de Minecraft
 */
export class ServerValidator {
  /**
   * Valida una carpeta de servidor según los criterios especificados
   */
  static async validateServerFolder(
    folderPath: string,
    criteria: FileValidationCriteria
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // Verificar que la carpeta existe
      if (!fs.existsSync(folderPath)) {
        result.isValid = false;
        result.errors.push(`La carpeta no existe: ${folderPath}`);
        return result;
      }

      const files = await ServerValidator.getFilesInfo(folderPath);
      result.details.filesFound = files.length;
      result.details.files = files;

      // Validar archivos requeridos
      if (criteria.requiredFiles && criteria.requiredFiles.length > 0) {
        const missingFiles = ServerValidator.validateRequiredFiles(files, criteria.requiredFiles);
        if (missingFiles.length > 0) {
          result.isValid = false;
          result.errors.push(`Archivos requeridos faltantes: ${missingFiles.join(', ')}`);
        }
      } else {
        // Si no hay archivos específicos requeridos, validar que sea un servidor de Minecraft
        const isMinecraftServer = ServerValidator.validateMinecraftServer(files);
        if (!isMinecraftServer.isValid) {
          result.isValid = false;
          result.errors.push(...isMinecraftServer.errors);
        }
        result.warnings.push(...isMinecraftServer.warnings);
      }

      // Validar extensiones permitidas
      if (criteria.allowedExtensions) {
        const invalidFiles = ServerValidator.validateFileExtensions(files, criteria.allowedExtensions);
        if (invalidFiles.length > 0) {
          result.warnings.push(`Archivos con extensiones no permitidas: ${invalidFiles.join(', ')}`);
        }
      }

      // Validar tamaños de archivos
      if (criteria.minSize !== undefined || criteria.maxSize !== undefined) {
        const sizeIssues = ServerValidator.validateFileSizes(files, criteria.minSize, criteria.maxSize);
        if (sizeIssues.length > 0) {
          result.warnings.push(...sizeIssues);
        }
      }

      // Validar contenido de archivos
      if (criteria.contentPatterns || criteria.forbiddenPatterns) {
        const contentIssues = await ServerValidator.validateFileContent(
          folderPath,
          files,
          criteria.contentPatterns,
          criteria.forbiddenPatterns
        );
        if (contentIssues.length > 0) {
          result.warnings.push(...contentIssues);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Error durante la validación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return result;
  }

  /**
   * Obtiene información de todos los archivos en una carpeta
   */
  private static async getFilesInfo(folderPath: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(folderPath, entry.name);
          const stats = fs.statSync(filePath);
          
          files.push({
            name: entry.name,
            path: filePath,
            size: stats.size,
            extension: path.extname(entry.name).toLowerCase(),
            lastModified: stats.mtime,
            exists: true
          });
        }
      }
    } catch (error) {
      console.error(`Error leyendo archivos de ${folderPath}:`, error);
    }

    return files;
  }

  /**
   * Valida archivos requeridos
   */
  private static validateRequiredFiles(files: FileInfo[], requiredFiles: string[]): string[] {
    const fileNames = files.map(f => f.name.toLowerCase());
    return requiredFiles.filter(required => 
      !fileNames.includes(required.toLowerCase())
    );
  }

  /**
   * Valida si una carpeta contiene un servidor de Minecraft válido
   */
  private static validateMinecraftServer(files: FileInfo[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: { files }
    };

    const fileNames = files.map(f => f.name.toLowerCase());
    
    // Buscar archivos JAR de servidor (patrones comunes)
    const serverJarPatterns = [
      /^server\.jar$/,
      /^minecraft_server.*\.jar$/,
      /^paper.*\.jar$/,
      /^spigot.*\.jar$/,
      /^bukkit.*\.jar$/,
      /^forge.*\.jar$/,
      /^fabric.*\.jar$/,
      /^quilt.*\.jar$/,
      /.*server.*\.jar$/
    ];

    const hasServerJar = fileNames.some(fileName => 
      serverJarPatterns.some(pattern => pattern.test(fileName))
    );

    // Buscar archivos de configuración típicos
    const configFiles = [
      'server.properties',
      'eula.txt',
      'bukkit.yml',
      'spigot.yml',
      'paper.yml'
    ];

    const hasConfigFile = configFiles.some(config => 
      fileNames.includes(config)
    );

    // Validar que tenga al menos un JAR de servidor O archivos de configuración
    if (!hasServerJar && !hasConfigFile) {
      result.isValid = false;
      result.errors.push('No se encontró un archivo JAR de servidor válido ni archivos de configuración de Minecraft');
    }

    // Advertencias para mejores prácticas
    if (!fileNames.includes('eula.txt')) {
      result.warnings.push('Archivo eula.txt no encontrado - puede ser necesario para el funcionamiento del servidor');
    }

    if (!fileNames.includes('server.properties')) {
      result.warnings.push('Archivo server.properties no encontrado - configuración del servidor puede estar incompleta');
    }

    return result;
  }

  /**
   * Valida las extensiones de archivos
   */
  private static validateFileExtensions(files: FileInfo[], allowedExtensions: string[]): string[] {
    const allowed = allowedExtensions.map(ext => ext.toLowerCase());
    return files
      .filter(file => !allowed.includes(file.extension))
      .map(file => file.name);
  }

  /**
   * Valida los tamaños de archivos
   */
  private static validateFileSizes(
    files: FileInfo[],
    minSize?: number,
    maxSize?: number
  ): string[] {
    const issues: string[] = [];

    for (const file of files) {
      if (minSize !== undefined && file.size < minSize) {
        issues.push(`${file.name} es muy pequeño (${file.size} bytes, mínimo: ${minSize})`);
      }
      if (maxSize !== undefined && file.size > maxSize) {
        issues.push(`${file.name} es muy grande (${file.size} bytes, máximo: ${maxSize})`);
      }
    }

    return issues;
  }

  /**
   * Valida el contenido de archivos de texto
   */
  private static async validateFileContent(
    folderPath: string,
    files: FileInfo[],
    requiredPatterns?: string[],
    forbiddenPatterns?: string[]
  ): Promise<string[]> {
    const issues: string[] = [];
    const textExtensions = ['.txt', '.properties', '.yml', '.yaml', '.json', '.cfg', '.conf'];

    for (const file of files) {
      if (!textExtensions.includes(file.extension)) continue;

      try {
        const content = fs.readFileSync(file.path, 'utf-8');

        // Verificar patrones requeridos
        if (requiredPatterns) {
          for (const pattern of requiredPatterns) {
            if (!content.includes(pattern)) {
              issues.push(`${file.name} no contiene el patrón requerido: ${pattern}`);
            }
          }
        }

        // Verificar patrones prohibidos
        if (forbiddenPatterns) {
          for (const pattern of forbiddenPatterns) {
            if (content.includes(pattern)) {
              issues.push(`${file.name} contiene el patrón prohibido: ${pattern}`);
            }
          }
        }
      } catch (error) {
        issues.push(`Error leyendo contenido de ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return issues;
  }

  /**
   * Detecta el tipo de servidor basado en los archivos presentes
   */
  static detectServerType(files: FileInfo[]): string {
    const fileNames = files.map(f => f.name.toLowerCase());
    
    if (fileNames.some(name => name.includes('forge'))) return 'forge';
    if (fileNames.some(name => name.includes('fabric'))) return 'fabric';
    if (fileNames.some(name => name.includes('paper'))) return 'paper';
    if (fileNames.some(name => name.includes('spigot'))) return 'spigot';
    if (fileNames.some(name => name.includes('bukkit'))) return 'bukkit';
    if (fileNames.some(name => name.endsWith('.jar'))) return 'vanilla';
    
    return 'unknown';
  }

  /**
   * Extrae la versión del servidor desde los archivos
   */
  static extractServerVersion(files: FileInfo[]): string | undefined {
    // Buscar en archivos .jar
    const jarFiles = files.filter(f => f.extension === '.jar');
    for (const jar of jarFiles) {
      const versionMatch = jar.name.match(/(\d+\.\d+(?:\.\d+)?)/);  
      if (versionMatch) {
        return versionMatch[1];
      }
    }

    // Buscar en server.properties
    const propsFile = files.find(f => f.name.toLowerCase() === 'server.properties');
    if (propsFile) {
      try {
        const content = fs.readFileSync(propsFile.path, 'utf-8');
        const versionMatch = content.match(/version[=:]\s*([\d\.]+)/i);
        if (versionMatch) {
          return versionMatch[1];
        }
      } catch (error) {
        console.error('Error leyendo server.properties:', error);
      }
    }

    return undefined;
  }
}