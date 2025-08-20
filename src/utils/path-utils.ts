import path from 'path';
import fs from 'node:fs/promises';

/**
 * Resultado de la validación de una ruta
 */
export interface ValidationResult {
  isValid: boolean;
  normalizedPath: string;
  errors: string[];
}

/**
 * Resultado de la extracción de servidor y ruta
 */
export interface ServerPathResult {
  serverName: string;
  filePath: string;
}

/**
 * Decodifica componentes de ruta que pueden estar codificados en URI
 * @param encodedPath - Ruta potencialmente codificada
 * @returns Ruta decodificada o la original si falla la decodificación
 */
export function decodePathComponents(encodedPath: string): string {
  try {
    return decodeURIComponent(encodedPath);
  } catch (error) {
    return encodedPath;
  }
}

/**
 * Remueve nombres de servidor duplicados en la ruta
 * @param filePath - Ruta de archivo a procesar
 * @returns Ruta sin duplicados de nombres de servidor
 */
export function removeDuplicateServerNames(filePath: string): string {
  const parts = filePath.split(/[\\\/]+/).filter(part => part.length > 0);
  
  if (parts.length < 2) return filePath;
  
  const firstPart = parts[0];
  let duplicateCount = 0;
  
  for (let i = 1; i < parts.length; i++) {
    if (parts[i] === firstPart && i === duplicateCount + 1) {
      duplicateCount++;
    } else {
      break;
    }
  }
  
  if (duplicateCount > 0) {
    parts.splice(1, duplicateCount);
  }
  
  return parts.join(path.sep);
}

/**
 * Normaliza una ruta eliminando caracteres inválidos y aplicando formato estándar
 * @param inputPath - Ruta de entrada a normalizar
 * @returns Ruta normalizada
 * @throws Error si la ruta es inválida
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Ruta inválida: debe ser una cadena no vacía');
  }
  
  let cleanPath = decodePathComponents(inputPath);
  cleanPath = removeDuplicateServerNames(cleanPath);
  
  // Limpiar caracteres y patrones problemáticos
  cleanPath = cleanPath
    .replace(/^(\.[\\\/])+/, '') // Remover ./ o .\\ al inicio
    .replace(/[\\\/]{2,}/g, path.sep) // Normalizar separadores múltiples
    .trim();
  
  // Normalizar usando path.normalize
  cleanPath = path.normalize(cleanPath);
  
  // Remover caracteres inválidos para nombres de archivo
  cleanPath = cleanPath.replace(/[<>:"|?*\x00-\x1f\x7f-\x9f]/g, '');
  
  // Remover separadores al inicio y final
  cleanPath = cleanPath.replace(/^[\\\/]+|[\\\/]+$/g, '');
  
  return cleanPath;
}

/**
 * Verifica si una ruta existe en el sistema de archivos
 * @param targetPath - Ruta a verificar
 * @returns Promise que resuelve a true si existe, false en caso contrario
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica si una ruta es un directorio
 * @param targetPath - Ruta a verificar
 * @returns Promise que resuelve a true si es directorio, false en caso contrario
 */
export async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Construye una ruta segura dentro de un directorio base
 * @param relativePath - Ruta relativa a procesar
 * @param basePath - Directorio base donde construir la ruta (por defecto: proceso actual)
 * @returns Ruta absoluta segura
 * @throws Error si la ruta está fuera del directorio permitido
 */
export function buildSafePath(relativePath: string, basePath: string = process.cwd()): string {
  const normalizedPath = normalizePath(relativePath);
  
  if (!normalizedPath) {
    throw new Error('Ruta inválida: la ruta normalizada está vacía');
  }
  
  const fullPath = path.join(basePath, normalizedPath);
  const resolvedPath = path.resolve(fullPath);
  const resolvedBasePath = path.resolve(basePath);
  
  // Verificar que la ruta esté dentro del directorio base
  if (!resolvedPath.startsWith(resolvedBasePath + path.sep) && resolvedPath !== resolvedBasePath) {
    throw new Error(`Ruta no permitida: '${relativePath}' está fuera del directorio base`);
  }
  
  return resolvedPath;
}

/**
 * Construye una ruta segura con validación de existencia del directorio padre
 * @param relativePath - Ruta relativa a procesar
 * @param basePath - Directorio base donde construir la ruta (por defecto: proceso actual)
 * @returns Promise que resuelve a la ruta absoluta segura
 * @throws Error si el directorio padre no existe
 */
export async function buildSafePathWithValidation(relativePath: string, basePath: string = process.cwd()): Promise<string> {
  const safePath = buildSafePath(relativePath, basePath);
  const parentDir = path.dirname(safePath);
  
  if (!(await pathExists(parentDir))) {
    throw new Error(`El directorio padre no existe: ${parentDir}`);
  }
  
  return safePath;
}

/**
 * Valida que los directorios anidados sean válidos
 * @param pathParts - Partes de la ruta a validar
 * @returns true si todos los directorios son válidos
 */
export function validateNestedDirectories(pathParts: string[]): boolean {
  if (pathParts.length <= 1) return true;
  
  return pathParts.every(part => part.trim().length > 0);
}

/**
 * Extrae el nombre del servidor y la ruta del archivo de una ruta completa
 * @param fullPath - Ruta completa a procesar
 * @returns Objeto con serverName y filePath
 * @throws Error si no se puede extraer la información
 */
export function extractServerAndPath(fullPath: string): ServerPathResult {
  const normalizedPath = normalizePath(fullPath);
  const parts = normalizedPath.split(path.sep).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    throw new Error('Ruta inválida: no se puede extraer información del servidor');
  }
  
  if (!validateNestedDirectories(parts)) {
    throw new Error('Ruta inválida: contiene directorios anidados malformados');
  }
  
  const serverName = parts[0];
  const filePath = parts.slice(1).join(path.sep);
  
  return { serverName, filePath };
}

/**
 * Valida una ruta de entrada y retorna información detallada sobre su validez
 * @param inputPath - Ruta a validar
 * @returns Resultado de validación con errores si los hay
 */
export function validatePath(inputPath: string): ValidationResult {
  const errors: string[] = [];
  let normalizedPath = '';
  
  try {
    if (!inputPath || typeof inputPath !== 'string') {
      errors.push('La ruta debe ser una cadena no vacía');
      return { isValid: false, normalizedPath: '', errors };
    }
    
    normalizedPath = normalizePath(inputPath);
    
    if (!normalizedPath) {
      errors.push('La ruta normalizada está vacía');
    }
    
    // Verificar caracteres de control
    if (/[\x00-\x1f\x7f-\x9f]/.test(normalizedPath)) {
      errors.push('La ruta contiene caracteres de control no válidos');
    }
    
    // Verificar longitud
    if (normalizedPath.length > 200) {
      errors.push('La ruta es demasiado larga');
    }
    
    // Verificar nombres reservados de Windows
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    const pathParts = normalizedPath.split(path.sep);
    for (const part of pathParts) {
      const baseName = part.split('.')[0].toUpperCase();
      if (reservedNames.includes(baseName)) {
        errors.push(`Nombre reservado no permitido: ${part}`);
      }
    }
    
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Error desconocido al validar la ruta');
  }
  
  return {
    isValid: errors.length === 0,
    normalizedPath,
    errors
  };
}

/**
 * Crea una ruta segura validando primero la entrada
 * @param inputPath - Ruta de entrada
 * @param basePath - Directorio base donde construir la ruta (por defecto: proceso actual)
 * @returns Ruta segura construida
 * @throws Error si la validación falla
 */
export function createSafePath(inputPath: string, basePath: string = process.cwd()): string {
  const validation = validatePath(inputPath);
  
  if (!validation.isValid) {
    throw new Error(`Ruta inválida: ${validation.errors.join(', ')}`);
  }
  
  return buildSafePath(validation.normalizedPath, basePath);
}

/**
 * Objeto con todas las utilidades de ruta exportadas
 */
export const PathUtils = {
  decodePathComponents,
  removeDuplicateServerNames,
  normalizePath,
  buildSafePath,
  buildSafePathWithValidation,
  pathExists,
  isDirectory,
  validateNestedDirectories,
  extractServerAndPath,
  validatePath,
  createSafePath
};

export default PathUtils;