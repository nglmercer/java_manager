// examples/test-backup-service.ts
import { BackupService, type ServerBackupOptions, type BackupRestoreOptions } from '../src/services/backup.service.js';
import { defaultPaths } from '../src/config.js';
import { FileUtils } from '../src/utils/file.utils.js';
import { isSuccess } from '../src/utils/validator.js';
import path from 'path';

/**
 * Test script for the backup service
 * This script tests all the main functionality of the backup service
 */

async function testBackupService() {
  console.log('🧪 Starting Backup Service Tests...');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Create a test server directory
    console.log('\n📁 Test 1: Creating test server directory...');
    await createTestServer();
    
    // Test 2: List backups (should be empty initially)
    console.log('\n📋 Test 2: Listing existing backups...');
    await testListBackups();
    
    // Test 3: Create a backup
    console.log('\n💾 Test 3: Creating server backup...');
    const backupResult = await testCreateBackup();
    
    // Test 4: List backups again (should show our new backup)
    console.log('\n📋 Test 4: Listing backups after creation...');
    await testListBackups();
    
    // Test 5: Get backup info
    console.log('\n🔍 Test 5: Getting backup information...');
    if (backupResult) {
      await testGetBackupInfo(backupResult);
    }
    
    // Test 6: Restore backup
    console.log('\n🔄 Test 6: Restoring backup...');
    if (backupResult) {
      await testRestoreBackup(backupResult);
    }
    
    // Test 7: Delete backup
    console.log('\n🗑️ Test 7: Deleting backup...');
    if (backupResult) {
      await testDeleteBackup(backupResult);
    }
    
    // Test 8: Final cleanup
    console.log('\n🧹 Test 8: Cleaning up test files...');
    await cleanupTestFiles();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

/**
 * Creates a test server directory with some sample files
 */
async function createTestServer(): Promise<void> {
  const testServerName = 'test-server';
  const testServerPath = path.join(defaultPaths.serversPath, testServerName);
  
  console.log(`Creating test server at: ${testServerPath}`);
  
  // Create server directory structure
  const createResult = await FileUtils.createFile(
    defaultPaths.serversPath,
    testServerName,
    'server.properties',
    'server-port=25565\nmotd=Test Server\ndifficulty=easy'
  );
  
  if (!isSuccess(createResult)) {
    throw new Error(`Failed to create test server: ${createResult.error}`);
  }
  
  // Create additional test files
  await FileUtils.createFile(
    defaultPaths.serversPath,
    testServerName,
    'eula.txt',
    'eula=true'
  );
  
  await FileUtils.createFile(
    defaultPaths.serversPath,
    path.join(testServerName, 'logs'),
    'latest.log',
    '[INFO] Server started successfully\n[INFO] Test log entry'
  );
  
  console.log('✅ Test server created successfully');
}

/**
 * Tests listing backups
 */
async function testListBackups(): Promise<void> {
  const listResult = await BackupService.listBackups();
  
  if (!isSuccess(listResult)) {
    throw new Error(`Failed to list backups: ${listResult.error}`);
  }
  
  console.log(`Found ${listResult.data.length} backup(s):`);
  listResult.data.forEach((backup, index) => {
    console.log(`  ${index + 1}. ${backup.name} (${backup.sizeFormatted}) - ${backup.created}`);
    if (backup.serverName) {
      console.log(`     Server: ${backup.serverName}`);
    }
  });
}

/**
 * Tests creating a backup
 */
async function testCreateBackup(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const backupOptions: ServerBackupOptions = {
      serverName: 'test-server',
      useZip: true,
      compressionLevel: 6,
      onComplete: (result, task) => {
        console.log(`Backup completed: ${result.backupPath}`);
        console.log(`Task ID: ${task.id}, Status: ${task.status}`);
        const backupFileName = path.basename(result.backupPath);
        console.log(`✅ Backup created: ${backupFileName}`);
        console.log(`   Path: ${result.backupPath}`);
        console.log(`   Size: ${result.size || 0} bytes`);
        resolve(backupFileName);
      }
    };
    
    BackupService.createServerBackup(backupOptions).then(backupResult => {
      if (!isSuccess(backupResult)) {
        reject(new Error(`Failed to create backup: ${backupResult.error}`));
        return;
      }
      
      console.log(`🔄 Backup task started, waiting for completion...`);
      // The onComplete callback will resolve the promise
    }).catch(reject);
  });
}

/**
 * Tests getting backup information
 */
async function testGetBackupInfo(backupName: string): Promise<void> {
  const infoResult = await BackupService.getBackupInfo(backupName);
  
  if (!isSuccess(infoResult)) {
    throw new Error(`Failed to get backup info: ${infoResult.error}`);
  }
  
  const info = infoResult.data;
  console.log(`✅ Backup information:`);
  console.log(`   Name: ${info.name}`);
  console.log(`   Size: ${info.sizeFormatted}`);
  console.log(`   Created: ${info.created}`);
  console.log(`   Server: ${info.serverName || 'Unknown'}`);
  console.log(`   Valid: ${info.isValid ? 'Yes' : 'No'}`);
}

/**
 * Tests restoring a backup
 */
async function testRestoreBackup(backupName: string): Promise<void> {
  const restoreOptions: BackupRestoreOptions = {
    backupName,
    destinationServerName: 'test-server-restored',
    onComplete: (result, task) => {
      console.log(`Restore completed: ${result.destinationPath}`);
      console.log(`Task ID: ${task.id}, Status: ${task.status}`);
    }
  };
  
  const restoreResult = await BackupService.restoreBackup(restoreOptions);
  
  if (!isSuccess(restoreResult)) {
    throw new Error(`Failed to restore backup: ${restoreResult.error}`);
  }
  
  console.log(`✅ Backup restored to: ${restoreResult.data.destinationPath}`);
}

/**
 * Tests deleting a backup
 */
async function testDeleteBackup(backupName: string): Promise<void> {
  const deleteResult = await BackupService.deleteBackup(backupName);
  
  if (!isSuccess(deleteResult)) {
    throw new Error(`Failed to delete backup: ${deleteResult.error}`);
  }
  
  console.log(`✅ Backup deleted: ${backupName}`);
}

/**
 * Cleans up test files
 */
async function cleanupTestFiles(): Promise<void> {
  try {
    // Delete test server
    const deleteServerResult = await FileUtils.deletePath(defaultPaths.serversPath, 'test-server');
    if (isSuccess(deleteServerResult)) {
      console.log('✅ Test server deleted');
    }
    
    // Delete restored server
    const deleteRestoredResult = await FileUtils.deletePath(defaultPaths.serversPath, 'test-server-restored');
    if (isSuccess(deleteRestoredResult)) {
      console.log('✅ Restored test server deleted');
    }
    
  } catch (error) {
    console.warn('⚠️ Some cleanup operations failed:', error);
  }
}

/**
 * Helper function to wait for a specified time
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBackupService().catch(console.error);
}

export { testBackupService };