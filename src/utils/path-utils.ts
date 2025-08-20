import path from 'path';
import fs from 'node:fs/promises';
import { defaultPaths } from '../config.js';

/**
 * Utilidades para manejo seguro y robusto de rutas de archivos
 * Maneja casos como nombres duplicados, caracteres URL-encoded, y rutas malformadas
 */

/**
 * Decodifica caracteres URL-encoded en una ruta
 * @param encodedPath - Ruta con posibles caracteres URL-encoded
 * @returns Ruta decodificada
 */
export function decodePathComponents(encodedPath: string): string {
  try {
    return decodeURIComponent(encodedPath);
  } catch (error) {
    // Si falla la decodificación, devolver la ruta original
    return encodedPath;
  }
}

/**
 * Elimina duplicaciones de nombres de servidor en la ruta
 * Ejemplo: "NombreServidor/NombreServidor/archivo.txt" -> "NombreServidor/archivo.txt"
 * También maneja casos más complejos como "NombreServidor/NombreServidor/NombreServidor/archivo.txt"
 * @param filePath - Ruta que puede contener duplicaciones
 * @returns Ruta sin duplicaciones
 */
export function removeDuplicateServerNames(filePath: string): string {
  const parts = filePath.split(/[\\\/]+/).filter(part => part.length > 0);
  
  if (parts.length < 2) {
    return filePath;
  }
  
  // Eliminar duplicaciones consecutivas del primer segmento
  const firstPart = parts[0];
  let i = 1;
  while (i < parts.length && parts[i] === firstPart) {
    parts.splice(i, 1);
  }
  
  return parts.join(path.sep);
}

/**
 * Normaliza y limpia una ruta de archivo
 * @param inputPath - Ruta de entrada que puede estar malformada
 * @returns Ruta normalizada y limpia
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Ruta inválida: debe ser una cadena no vacía');
  }
  
  // 1. Decodificar caracteres URL-encoded
  let cleanPath = decodePathComponents(inputPath);
  
  // 2. Eliminar duplicaciones de nombres de servidor
  cleanPath = removeDuplicateServerNames(cleanPath);
  
  // 3. Normalizar separadores de ruta y eliminar caracteres peligrosos
  cleanPath = path.normalize(cleanPath)
    .replace(/^(\.[\\\/])+/, '') // Eliminar ./ o .\\ al inicio
    .replace(/[\\\/]{2,}/g, path.sep) // Reemplazar múltiples separadores
    .replace(/[<>:"|?*]/g, '') // Eliminar caracteres no válidos en nombres de archivo
    .trim();
  
  // 4. Eliminar separadores al inicio y final
  cleanPath = cleanPath.replace(/^[\\\/]+|[\\\/]+$/g, '');
  
  return cleanPath;
}

/**
 * Verifica si una ruta existe y es accesible
 * @param targetPath - Ruta a verificar
 * @returns Promise<boolean> - true si existe y es accesible
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
 * Verifica si una ruta existe y es un directorio
 * @param targetPath - Ruta a verificar
 * @returns Promise<boolean> - true si existe y es un directorio
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
 * Construye una ruta segura dentro del directorio de servidores
 * @param relativePath - Ruta relativa que puede estar malformada
 * @returns Ruta absoluta segura
 * @throws Error si la ruta resultante está fuera del directorio permitido
 */
export function buildSafePath(relativePath: string): string {
  // Normalizar la ruta de entrada
  const normalizedPath = normalizePath(relativePath);
  
  if (!normalizedPath) {
    throw new Error('Ruta inválida: la ruta normalizada está vacía');
  }
  
  // Construir la ruta completa
  const fullPath = path.join(defaultPaths.serversPath, normalizedPath);
  const resolvedPath = path.resolve(fullPath);
  const resolvedBasePath = path.resolve(defaultPaths.serversPath);
  
  // Verificar que la ruta esté dentro del directorio permitido
  if (!resolvedPath.startsWith(resolvedBasePath + path.sep) && resolvedPath !== resolvedBasePath) {
    throw new Error(`Ruta no permitida: '${relativePath}' está fuera del directorio de servidores`);
  }
  
  return resolvedPath;
}

/**
 * Construye una ruta segura y verifica que el directorio padre existe
 * @param relativePath - Ruta relativa que puede estar malformada
 * @returns Promise<string> - Ruta absoluta segura
 * @throws Error si la ruta es inválida o el directorio padre no existe
 */
export async function buildSafePathWithValidation(relativePath: string): Promise<string> {
  const safePath = buildSafePath(relativePath);
  const parentDir = path.dirname(safePath);
  
  // Verificar que el directorio padre existe
  if (!(await pathExists(parentDir))) {
    throw new Error(`El directorio padre no existe: ${parentDir}`);
  }
  
  return safePath;
}

/**
 * Extrae el nombre del servidor y la ruta del archivo de una ruta completa
 * @param fullPath - Ruta completa que puede incluir servidor y archivo
 * @returns Objeto con serverName y filePath separados
 */
export function extractServerAndPath(fullPath: string): { serverName: string; filePath: string } {
  const normalizedPath = normalizePath(fullPath);
  const parts = normalizedPath.split(path.sep).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    throw new Error('Ruta inválida: no se puede extraer información del servidor');
  }
  
  const serverName = parts[0];
  const filePath = parts.slice(1).join(path.sep);
  
  return { serverName, filePath };
}

/**
 * Valida que una ruta sea segura y esté bien formada
 * @param inputPath - Ruta a validar
 * @returns Objeto con información de validación
 */
export function validatePath(inputPath: string): {
  isValid: boolean;
  normalizedPath: string;
  errors: string[];
} {
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
    
    // Verificar caracteres peligrosos restantes
    if (/[\x00-\x1f\x7f-\x9f]/.test(normalizedPath)) {
      errors.push('La ruta contiene caracteres de control no válidos');
    }
    
    // Verificar longitud máxima (Windows tiene límite de 260 caracteres)
    if (normalizedPath.length > 200) {
      errors.push('La ruta es demasiado larga');
    }
    
    // Verificar que no contenga nombres reservados de Windows
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
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
 * Utilidad principal que combina todas las funciones de limpieza y validación
 * @param inputPath - Ruta de entrada
 * @returns Ruta segura y validada
 * @throws Error con detalles específicos si la ruta no es válida
 */
export function createSafePath(inputPath: string): string {
  const validation = validatePath(inputPath);
  
  if (!validation.isValid) {
    throw new Error(`Ruta inválida: ${validation.errors.join(', ')}`);
  }
  
  return buildSafePath(validation.normalizedPath);
}

/**
 * Exportar todas las utilidades como un objeto
 */
export const PathUtils = {
  decodePathComponents,
  removeDuplicateServerNames,
  normalizePath,
  buildSafePath,
  buildSafePathWithValidation,
  pathExists,
  isDirectory,
  extractServerAndPath,
  validatePath,
  createSafePath
};

export default PathUtils;