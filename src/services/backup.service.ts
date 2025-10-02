// src/services/backup.service.ts
import path from 'node:path';
import { defaultPaths } from '../config.js';
import { taskManager } from './taskInstance.js';
import { FileUtils, asyncHandler } from '../utils/file.utils.js';
import { PathUtils } from '../utils/path-utils.js';
import {
  createSuccessResponse,
  createErrorResponse,
  isSuccess
} from '../utils/validator.js';
import type {
  BackupOptions,
  RestoreOptions,
  BackupResult,
  RestoreResult,
  ITask
} from 'node-task-manager';

// ------------------------------------------------------------------
// 1. Types for the backup service
// ------------------------------------------------------------------

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  created: string;
  createdDate: Date;
  serverName?: string;
  isValid: boolean;
}

export interface ServerBackupOptions {
  serverName: string;
  outputFilename?: string;
  useZip?: boolean;
  compressionLevel?: number;
  exclude?: string[];
  onComplete?: (result: BackupResult, task: ITask) => void;
}

export interface BackupRestoreOptions {
  backupName: string;
  destinationServerName?: string;
  destinationFolderName?: string;
  onComplete?: (result: RestoreResult, task: ITask) => void;
}

export interface BackupListOptions {
  sortBy?: 'name' | 'size' | 'created';
  sortOrder?: 'asc' | 'desc';
  filterByServer?: string;
}

// Return type for operations that need task tracking
export interface BackupOperationResult extends BackupResult {
  taskId: string;
}

export interface RestoreOperationResult extends RestoreResult {
  taskId: string;
}

// ------------------------------------------------------------------
// 2. Internal implementation functions
// ------------------------------------------------------------------

/**
 * Creates a backup of a server directory
 */
const _createServerBackup = async (
  options: ServerBackupOptions
): Promise<BackupOperationResult> => {
  const { serverName, outputFilename, ...taskOptions } = options;
  
  // Validate server name
  const serverValidation = PathUtils.validatePath(serverName);
  if (!serverValidation.isValid) {
    throw new Error(`Invalid server name: ${serverValidation.errors.join(', ')}`);
  }
  
  // Check if server directory exists
  const serverPath = path.join(defaultPaths.serversPath, serverValidation.normalizedPath);
  const serverExists = await FileUtils.pathExists(serverPath);
  
  if (!isSuccess(serverExists) || !serverExists.data) {
    throw new Error(`Server directory does not exist: ${serverValidation.normalizedPath}`);
  }
  
  // Generate backup filename if not provided
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = outputFilename || `${serverValidation.normalizedPath}_backup_${timestamp}.zip`;
  
  // Create backup using TaskManager - returns { taskId, promise }
  const { taskId, promise } = taskManager.createBackup(serverPath, {
    ...taskOptions,
    outputFilename: backupFilename
  });
  
  // Wait for backup to complete
  const result = await promise;
  
  return {
    taskId,
    backupPath: result.backupPath,
    size: result.size
  };
};

/**
 * Restores a backup to a server directory
 */
const _restoreBackup = async (
  options: BackupRestoreOptions
): Promise<RestoreOperationResult> => {
  const { backupName, destinationServerName, ...taskOptions } = options;
  
  // Validate backup name
  const backupValidation = PathUtils.validatePath(backupName);
  if (!backupValidation.isValid) {
    throw new Error(`Invalid backup name: ${backupValidation.errors.join(', ')}`);
  }
  
  // Check if backup file exists
  const backupPath = path.join(defaultPaths.backupPath, backupValidation.normalizedPath);
  const backupExists = await FileUtils.pathExists(backupPath);
  
  if (!isSuccess(backupExists) || !backupExists.data) {
    throw new Error(`Backup file does not exist: ${backupValidation.normalizedPath}`);
  }
  
  // Determine destination folder name
  const destinationFolderName = destinationServerName 
    ? PathUtils.validatePath(destinationServerName).normalizedPath 
    : undefined;
  
  if (destinationServerName && destinationFolderName) {
    const serverValidation = PathUtils.validatePath(destinationServerName);
    if (!serverValidation.isValid) {
      throw new Error(`Invalid destination server name: ${serverValidation.errors.join(', ')}`);
    }
  }
  
  // Restore backup using TaskManager - returns { taskId, promise }
  const { taskId, promise } = taskManager.restoreBackup(backupPath, {
    ...taskOptions,
    destinationFolderName
  });
  
  // Wait for restore to complete
  //const result = await promise;
  
  return {
    taskId,
    destinationPath: destinationFolderName as string
  };
};

/**
 * Lists all available backups
 */
const _listBackups = async (
  options: BackupListOptions = {}
): Promise<BackupInfo[]> => {
  const { sortBy = 'created', sortOrder = 'desc', filterByServer } = options;
  
  // Check if backup directory exists
  const backupDirExists = await FileUtils.pathExists(defaultPaths.backupPath);
  if (!isSuccess(backupDirExists) || !backupDirExists.data) {
    return [];
  }
  
  // Get folder details
  const folderDetails = await FileUtils.getFolderDetails(defaultPaths.backupPath, '');
  if (!isSuccess(folderDetails)) {
    throw new Error(`Failed to read backup directory: ${folderDetails.error}`);
  }
  
  // Filter only files (not directories)
  const backupFiles = folderDetails.data.filter(item => !item.isDirectory);
  
  // Convert to BackupInfo format
  const backups: BackupInfo[] = backupFiles.map(file => {
    // Try to extract server name from filename
    const serverNameMatch = file.name.match(/^(.+?)_backup_/);
    const serverName = serverNameMatch ? serverNameMatch[1] : undefined;
    
    return {
      name: file.name,
      path: file.path,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      created: file.modified,
      createdDate: new Date(file.modified),
      serverName,
      isValid: isValidBackupFile(file.name)
    };
  });
  
  // Filter by server if specified
  let filteredBackups = backups;
  if (filterByServer) {
    filteredBackups = backups.filter(backup => 
      backup.serverName === filterByServer
    );
  }
  
  // Sort backups
  filteredBackups.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'created':
        comparison = a.createdDate.getTime() - b.createdDate.getTime();
        break;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  return filteredBackups;
};

/**
 * Deletes a backup file
 */
const _deleteBackup = async (backupName: string): Promise<boolean> => {
  // Validate backup name
  const backupValidation = PathUtils.validatePath(backupName);
  if (!backupValidation.isValid) {
    throw new Error(`Invalid backup name: ${backupValidation.errors.join(', ')}`);
  }
  
  // Check if backup file exists
  const backupPath = path.join(defaultPaths.backupPath, backupValidation.normalizedPath);
  const backupExists = await FileUtils.pathExists(backupPath);
  
  if (!isSuccess(backupExists) || !backupExists.data) {
    throw new Error(`Backup file does not exist: ${backupValidation.normalizedPath}`);
  }
  
  // Delete the backup file
  const deleteResult = await FileUtils.deletePath(defaultPaths.backupPath, backupValidation.normalizedPath);
  
  if (!isSuccess(deleteResult)) {
    throw new Error(`Failed to delete backup: ${deleteResult.error}`);
  }
  
  return true;
};

/**
 * Gets information about a specific backup
 */
const _getBackupInfo = async (backupName: string): Promise<BackupInfo> => {
  // Validate backup name
  const backupValidation = PathUtils.validatePath(backupName);
  if (!backupValidation.isValid) {
    throw new Error(`Invalid backup name: ${backupValidation.errors.join(', ')}`);
  }
  
  // Get all backups and find the specific one
  const allBackups = await _listBackups();
  const backup = allBackups.find(b => b.name === backupValidation.normalizedPath);
  
  if (!backup) {
    throw new Error(`Backup not found: ${backupValidation.normalizedPath}`);
  }
  
  return backup;
};

// ------------------------------------------------------------------
// 3. Helper functions
// ------------------------------------------------------------------

/**
 * Formats file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'N/A';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  
  const decimals = i === 0 ? 0 : i === 1 ? 1 : 2;
  return `${size.toFixed(decimals)} ${sizes[i]}`;
}

/**
 * Validates if a filename is a valid backup file
 */
function isValidBackupFile(filename: string): boolean {
  // Check for common backup file extensions
  const validExtensions = ['.zip', '.tar.gz', '.tar', '.7z'];
  const hasValidExtension = validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  
  // Check for backup naming pattern
  const hasBackupPattern = filename.includes('backup') || filename.includes('_bak_');
  
  return hasValidExtension && hasBackupPattern;
}

// ------------------------------------------------------------------
// 4. Public API
// ------------------------------------------------------------------

export const BackupService = {
  /** Creates a backup of a server directory */
  createServerBackup: asyncHandler<BackupOperationResult, [ServerBackupOptions]>(_createServerBackup),
  
  /** Restores a backup to a server directory */
  restoreBackup: asyncHandler<RestoreOperationResult, [BackupRestoreOptions]>(_restoreBackup),
  
  /** Lists all available backups */
  listBackups: asyncHandler<BackupInfo[], [BackupListOptions?]>(_listBackups),
  
  /** Deletes a backup file */
  deleteBackup: asyncHandler<boolean, [string]>(_deleteBackup),
  
  /** Gets information about a specific backup */
  getBackupInfo: asyncHandler<BackupInfo, [string]>(_getBackupInfo)
};

/**
 * Creates a backup of a server directory
 * 
 * @param options Configuration for the backup operation
 * @returns A Promise that resolves to a ServiceResponse containing BackupOperationResult
 */
export async function createServerBackup(options: ServerBackupOptions) {
  return BackupService.createServerBackup(options);
}

/**
 * Restores a backup to a server directory
 * 
 * @param options Configuration for the restore operation
 * @returns A Promise that resolves to a ServiceResponse containing RestoreOperationResult
 */
export async function restoreBackup(options: BackupRestoreOptions) {
  return BackupService.restoreBackup(options);
}

/**
 * Lists all available backups
 * 
 * @param options Optional filtering and sorting options
 * @returns A Promise that resolves to a ServiceResponse containing BackupInfo array
 */
export async function listBackups(options?: BackupListOptions) {
  return BackupService.listBackups(options);
}

/**
 * Deletes a backup file
 * 
 * @param backupName Name of the backup file to delete
 * @returns A Promise that resolves to a ServiceResponse containing boolean
 */
export async function deleteBackup(backupName: string) {
  return BackupService.deleteBackup(backupName);
}

/**
 * Gets information about a specific backup
 * 
 * @param backupName Name of the backup file
 * @returns A Promise that resolves to a ServiceResponse containing BackupInfo
 */
export async function getBackupInfo(backupName: string) {
  return BackupService.getBackupInfo(backupName);
}