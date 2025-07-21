// src/services/java-info.service.ts
import path from 'node:path';
import { env } from '../platforms/env.js';
import { CommandUtils } from '../utils/command-utils.js';
import { taskManager, defaultPaths } from '../services/taskInstance.js';
import { FileUtils, isSuccess, asyncHandler } from '../utils/file.utils.js';
// ------------------------------------------------------------------
// 1.  Types returned to the caller
// ------------------------------------------------------------------
export interface JavaRelease {
  featureVersion: number;      // e.g. 21
  releaseName:    string;      // e.g. "jdk-21.0.3+9"
  downloadUrl:    string;      // direct link to the archive
  checksumUrl:    string;      // sha256 link
  [key: string]: string | number;
}

export interface JavaVersionsInfo {
  available: number[];         // e.g. [8, 11, 17, 21, 22]
  lts:       number[];         // e.g. [8, 11, 17, 21]
  releases:  JavaRelease[];    // concrete binaries for current platform/arch
}

const ADOPTIUM_ARCH_MAP: Record<string, string | undefined> = {
    x32: 'x32',
    x64: 'x64',
    x86_64: 'x64',
    arm64: 'aarch64',
};
/** Converts Node’s process.platform/arch into Adoptium names. */
function adoptiumNames() {
  const platformMap: Record<string, string> = {
    win32: 'windows',
    linux: 'linux',
    darwin: 'mac',
    android: 'linux',           // Termux still uses linux tar.gz
  };

  const osName = platformMap[process.platform];
  const archName = ADOPTIUM_ARCH_MAP[process.arch];
  if (!osName || !archName) {
    throw new Error(
      `Unsupported platform/arch: ${process.platform}/${process.arch}`
    );
  }
  return { os: osName, arch: archName };
}


// --- Interfaces (sin cambios) ---
export interface JavaInfoTermux { /* ... */ }
export interface JavaInfoStandard { /* ... */ }
export type JavaInfo = JavaInfoTermux | JavaInfoStandard;

// --- Lógica Interna Asíncrona ---
const defaultPathBIN = './binaries/java';
/*
  Obtener version de java para minecraft server
  path: string;
  existVersion: boolean;
  versions: string[];
  arch: string;
  platform: string;
  fallbackURL: string;
  fallbackFilePath: string;
*/
const _getJavaInfoByVersion = async (javaVersion: string | number): Promise<JavaInfo> => {
  const versionStr = String(javaVersion ?? '');
  if (!versionStr) {
      throw new Error("La versión de Java no puede estar vacía.");
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

  return {

  }
};
async function _getJavaInstallableVersions(): Promise<JavaVersionsInfo> {
  const { os, arch } = adoptiumNames();

  // 3.1 – which feature releases exist?
  const availRes = await fetch('https://api.adoptium.net/v3/info/available_releases');
  if (!availRes.ok) throw new Error(`Adoptium API error: ${availRes.status}`);
  const { available_releases, most_recent_lts } =
    (await availRes.json()) as {
      available_releases: number[];
      most_recent_lts: number;
    };

  // 3.2 – for every available release, list latest GA binary
  const releases: JavaRelease[] = [];
  for (const feature of available_releases) {
    // Only consider GA releases (not ea)
    const url =
      `https://api.adoptium.net/v3/assets/latest/${feature}/hotspot?` +
      `os=${os}&architecture=${arch}&image_type=jdk&project=jdk`;
    const res = await fetch(url);
    if (!res.ok) continue; // version might not exist for this platform
    const payload = (await res.json()) as Array<{
      release_name: string;
      binary: {
        package: { name: string; link: string; checksum: string, size: number };
      };
    }>;

    if (!payload.length) continue;
    const { release_name, binary } = payload[0];
    //console.log("binary", binary);
    releases.push({
      featureVersion: feature,
      releaseName: release_name,
      downloadUrl: binary.package.link,
      checksumUrl: binary.package.checksum,
      size: binary.package.size,
      arch: arch,
      os: os,
    });
  }

  return {
    available: available_releases,
    lts: available_releases.filter((v) => v <= most_recent_lts),
    releases,
  };
}
async function filterReleases(releases: JavaRelease[], version: number): Promise<JavaRelease| false> {
  const findVersion = releases.find((r) => r.featureVersion === version);
  if (!findVersion) {
    return false;
  }

  return findVersion;
}
async function _downloadJavaRelease(
  release: JavaRelease,
  downloadPath?: string
): Promise<string> {
  const response = await fetch(release.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Java release: ${response.statusText}`);
  }
  
  //const filePath = path.join(downloadPath, path.basename(release.downloadUrl));
  const result = await taskManager.download(release.downloadUrl, {
      
  });
  
  return result;
}
async function _decompressJavaRelease(
  release: JavaRelease,
  unpackPath?: string
): Promise<string> {
  const result = await taskManager.unpack(release.downloadUrl, {
    destination: unpackPath
  });
  return result;
}
export const JavaInfoService = {
  getInstallableVersions: asyncHandler<JavaVersionsInfo,any>(_getJavaInstallableVersions),
  getJavaInfo: asyncHandler(_getJavaInfoByVersion),
  downloadJavaRelease: asyncHandler(_downloadJavaRelease),
  filter: asyncHandler(filterReleases),
  decompressJavaRelease: asyncHandler(_decompressJavaRelease),
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