import { Hono } from "hono";
import { BackupService, type ServerBackupOptions, type BackupRestoreOptions, type BackupListOptions } from '../../services/backup.service.js';
import { isSuccess } from '../../utils/validator.js';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { extname, join } from 'path';
import { stream } from 'hono/streaming';
import { defaultPaths,tempPath } from "../../config.js";
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
const BackupsRouter = new Hono();

// Validation schemas
const createBackupSchema = z.object({
  serverName: z.string().min(1, 'Server name is required'),
  outputFilename: z.string().optional(),
  useZip: z.boolean().optional().default(true),
  compressionLevel: z.number().min(1).max(9).optional().default(6),
  exclude: z.array(z.string()).optional()
});

const restoreBackupSchema = z.object({
  destinationServerName: z.string().optional(),
  destinationFolderName: z.string().optional()
});

const listBackupsSchema = z.object({
  sortBy: z.enum(['name', 'size', 'created']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filterByServer: z.string().optional()
});

const uploadBackupSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  overwrite: z.boolean().optional().default(false)
});

// GET /backups - List all backups
BackupsRouter.get('/', zValidator('query', listBackupsSchema), async (c) => {
  try {
    const options = c.req.valid('query') as BackupListOptions;
    const result = await BackupService.listBackups(options);
    
    if (!isSuccess(result)) {
      return c.json({ error: result.error }, 500);
    }
    
    return c.json({
      success: true,
      data: result.data,
      count: result.data.length
    });
  } catch (error) {
    return c.json({ error: 'Failed to list backups' }, 500);
  }
});

// POST /backups - Create a new backup
BackupsRouter.post('/', zValidator('json', createBackupSchema), async (c) => {
  try {
    const options = c.req.valid('json') as ServerBackupOptions;
    const result = await BackupService.createServerBackup(options);
    
    if (!isSuccess(result)) {
      return c.json({ error: result.error }, 500);
    }
    
    return c.json({
      success: true,
      message: 'Backup created successfully',
      data: result.data
    }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create backup' }, 500);
  }
});

// GET /backups/:name - Get backup information
BackupsRouter.get('/:name', async (c) => {
  try {
    const backupName = c.req.param('name');
    const result = await BackupService.getBackupInfo(backupName);
    
    if (!isSuccess(result)) {
      return c.json({ error: result.error }, 404);
    }
    
    return c.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return c.json({ error: 'Failed to get backup info' }, 500);
  }
});

// DELETE /backups/:name - Delete a backup
BackupsRouter.delete('/:name', async (c) => {
  try {
    const backupName = c.req.param('name');
    const result = await BackupService.deleteBackup(backupName);
    
    if (!isSuccess(result)) {
      return c.json({ error: result.error }, 404);
    }
    
    return c.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    return c.json({ error: 'Failed to delete backup' }, 500);
  }
});

// POST /backups/:name/restore - Restore a backup
BackupsRouter.post('/:name/restore', zValidator('json', restoreBackupSchema), async (c) => {
  try {
    const backupName = c.req.param('name');
    const options = c.req.valid('json') as Omit<BackupRestoreOptions, 'backupName'>;
    
    const restoreOptions: BackupRestoreOptions = {
      backupName,
      ...options
    };
    
    const result = await BackupService.restoreBackup(restoreOptions);
    
    if (!isSuccess(result)) {
      return c.json({ error: result.error }, 500);
    }
    
    return c.json({
      success: true,
      message: 'Backup restored successfully',
      data: result.data
    });
  } catch (error) {
    return c.json({ error: 'Failed to restore backup' }, 500);
  }
});

// GET /backups/:name/download - Download a backup file
BackupsRouter.get('/:name/download', async (c) => {
  try {
    const backupName = c.req.param('name');
    const result = await BackupService.getBackupInfo(backupName);
    console.log("download result",result)

    if (!isSuccess(result)) {
      return c.json({ error: result.error }, 404);
    }
    
    const backup = result.data;
    // Construct the full backup path using defaultPaths.backupPath
    const backupPath = join(defaultPaths.backupPath, backup.name);
    console.log("backup path:", backupPath);
    // Check if file exists and get stats
    try {
      const fileStats = await stat(backupPath);
      
      // Determine content type based on file extension
      const ext = extname(backupPath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.zip') {
        contentType = 'application/zip';
      } else if (ext === '.tar') {
        contentType = 'application/x-tar';
      } else if (ext === '.gz' || ext === '.tar.gz') {
        contentType = 'application/gzip';
      }
      
      // Set headers for file download
      c.header('Content-Disposition', `attachment; filename="${backup.name}"`);
      c.header('Content-Type', contentType);
      c.header('Content-Length', fileStats.size.toString());
      c.header('Cache-Control', 'no-cache');
      
      // Create and return file stream using Hono's streaming helper
      return stream(c, async (stream) => {
        const fileStream = createReadStream(backupPath);
        
        // Convert Node.js ReadStream to Web API ReadableStream
        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk: string | Buffer<ArrayBufferLike>) => {
              controller.enqueue(Buffer.isBuffer(chunk) ? new Uint8Array(chunk) : new TextEncoder().encode(chunk));
            });
            
            fileStream.on('end', () => {
              controller.close();
            });
            
            fileStream.on('error', (error) => {
              controller.error(error);
            });
          },
          
          cancel() {
            fileStream.destroy();
          }
        });
        
        await stream.pipe(webStream);
      });
    } catch (fileError) {
      return c.json({ error: 'Backup file not found or inaccessible' }, 404);
    }
  } catch (error) {
    return c.json({ error: 'Failed to download backup' }, 500);
  }
});

// POST /backups/upload - Upload a backup file
BackupsRouter.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;
    const overwrite = body['overwrite'] === 'true' || body['overwrite'];
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file extension (only allow common backup formats)
    const allowedExtensions = ['.zip', '.tar', '.gz', '.tar.gz', '.7z', '.rar'];
    const fileExtension = extname(file.name).toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidExtension) {
      return c.json({ 
        error: 'Invalid file format. Allowed formats: ' + allowedExtensions.join(', ') 
      }, 400);
    }
    
    // Ensure backup directory exists
    if (!existsSync(defaultPaths.backupPath)) {
      await mkdir(defaultPaths.backupPath, { recursive: true });
    }
    
    const backupPath = join(defaultPaths.backupPath, file.name);
    
    // Check if file already exists and overwrite is not allowed
    if (existsSync(backupPath) && !overwrite) {
      return c.json({ 
        error: 'File already exists. Set overwrite=true to replace it.' 
      }, 409);
    }
    
    // Convert File to Buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await writeFile(backupPath, buffer);
    
    return c.json({
      success: true,
      message: 'Backup uploaded successfully',
      data: {
        filename: file.name,
        size: file.size,
        path: backupPath,
        overwritten: existsSync(backupPath) && overwrite
      }
    }, 201);
    
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload backup' }, 500);
  }
});

export {BackupsRouter};


