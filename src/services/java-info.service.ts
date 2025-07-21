// src/services/java-info.service.ts
import path from 'node:path';
import { env } from '../platforms/env.js';
import { CommandUtils } from '../utils/command-utils.js';
import { FileUtils, isSuccess, asyncHandler } from '../utils/file.utils.js';

// --- Interfaces (sin cambios) ---
export interface JavaInfoTermux { /* ... */ }
export interface JavaInfoStandard { /* ... */ }
export type JavaInfo = JavaInfoTermux | JavaInfoStandard;

const ADOPTIUM_ARCH_MAP: Record<string, string | undefined> = {
    x32: 'x32',
    x64: 'x64',
    x86_64: 'x64',
    arm64: 'aarch64',
};

// --- Lógica Interna Asíncrona ---
const defaultPathBIN = './binaries/java';
const _getJavaInfoByVersion = async (javaVersion: string | number): Promise<JavaInfo> => {
  const versionStr = String(javaVersion ?? '');
  if (!versionStr) {
      throw new Error("La versión de Java no puede estar vacía.");
  }

  // --- Caso Especial: Termux ---
  if (env.isTermux()) {
    const packageName = `openjdk-${versionStr}`;
    const installedResult = await CommandUtils.isPackageInstalled(packageName);
    
    // Si la comprobación falla, asumimos que no está instalado
    const isInstalled = isSuccess(installedResult) && installedResult.data;

    return {
      isTermux: true,
      version: versionStr,
      packageName,
      installCmd: `pkg install ${packageName}`,
      javaPath: '/data/data/com.termux/files/usr/bin/',
      installed: isInstalled,
    };
  }

  // --- Caso Estándar: Windows, Linux, macOS ---
  const arch = ADOPTIUM_ARCH_MAP[env.arch];
  if (!arch) {
    throw new Error(`Arquitectura no soportada para la API de Adoptium: ${env.arch}`);
  }

  const resultURL = `https://api.adoptium.net/v3/binary/latest/${versionStr}/ga/${env.platform.name}/${arch}/jdk/hotspot/normal/eclipse?project=jdk`;
  const filename = `Java-${versionStr}-${arch}${env.platform.ext}`;
  
  const relativeUnpackPath = path.join(defaultPathBIN, `jdk-${versionStr}`);
  const absoluteUnpackPath = path.resolve(relativeUnpackPath);

  // --- Lógica mejorada para encontrar el 'bin' usando FileUtils ---
  let javaBinPath = path.join(absoluteUnpackPath, 'bin');
  const unpackPathExists = await FileUtils.pathExists(absoluteUnpackPath);

  // Si la ruta 'bin' por defecto no existe, pero la carpeta de descompresión sí, la buscamos dentro.
  if (isSuccess(unpackPathExists) && unpackPathExists.data) {
      const binPathExists = await FileUtils.pathExists(javaBinPath);
      if (!isSuccess(binPathExists) || !binPathExists.data) {
          const folderDetailsResult = await FileUtils.getFolderDetails(defaultPathBIN, `jdk-${versionStr}`);
          if (isSuccess(folderDetailsResult)) {
              const files = folderDetailsResult.data;
              // Caso macOS
              if (env.isMacOS() && files.length > 0) {
                  const macOsHomePath = path.join(absoluteUnpackPath, files[0].name, 'Contents', 'Home');
                  javaBinPath = path.join(macOsHomePath, 'bin');
              } else {
                  // Caso Linux/Windows
                  const jdkFolder = files.find(f => f.isDirectory && f.name.startsWith('jdk-'));
                  if (jdkFolder) {
                      javaBinPath = path.join(absoluteUnpackPath, jdkFolder.name, 'bin');
                  }
              }
          }
      }
  }

  return {
    isTermux: false,
    url: resultURL,
    filename,
    version: versionStr,
    downloadPath: path.join(defaultPathBIN, filename),
    unpackPath: relativeUnpackPath,
    absoluteDownloadPath: path.resolve(defaultPathBIN, filename),
    absoluteUnpackPath,
    javaBinPath,
    installed: await FileUtils.pathExists(javaBinPath),
  };
};

// --- API Pública Exportada ---

/**
 * Obtiene de forma asíncrona la información necesaria para descargar o verificar una versión de Java.
 * Devuelve un objeto ServiceResponse que contiene JavaInfo en caso de éxito.
 *
 * @param javaVersion La versión de Java a buscar (ej. 8, 11, 17).
 * @returns Una Promesa que resuelve a un objeto `ServiceResponse<JavaInfo>`.
 */
export const getJavaInfo = asyncHandler(_getJavaInfoByVersion);