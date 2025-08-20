import { Hono } from "hono";
import path from "path";
import { FileUtils } from "../../utils/file.utils.js";
import { defaultPaths } from "../../config.js";
import { PathUtils } from "../../utils/path-utils.js";
import fs from "node:fs/promises";
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { extname } from 'path';
import { stream } from 'hono/streaming';
import {BackupsRouter} from "./backups.js";

const FilemanagerRouter = new Hono();

// Mount backup routes
FilemanagerRouter.route('/backups', BackupsRouter);

// Usar las utilidades de rutas mejoradas
const { createSafePath, validatePath, extractServerAndPath, pathExists, isDirectory, buildSafePathWithValidation } = PathUtils;

// GET /folder-info/:folderName - Obtener información de una carpeta
FilemanagerRouter.get('/folder-info/:folderName', async (c) => {
  try {
    const folderName = c.req.param('folderName');
    
    // Validar el nombre de la carpeta
    const folderValidation = validatePath(folderName);
    if (!folderValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de carpeta inválido: ${folderValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Verificar que el directorio base existe
    if (!(await pathExists(defaultPaths.serversPath))) {
      return c.json({ 
        success: false, 
        error: `El directorio de servidores no existe: ${defaultPaths.serversPath}` 
      }, 500);
    }
    
    // Construir ruta segura y verificar que existe
    const targetPath = path.join(defaultPaths.serversPath, folderValidation.normalizedPath);
    if (!(await pathExists(targetPath))) {
      return c.json({ 
        success: false, 
        error: `El directorio no existe: ${folderValidation.normalizedPath}` 
      }, 404);
    }
    
    if (!(await isDirectory(targetPath))) {
      return c.json({ 
        success: false, 
        error: `La ruta especificada no es un directorio: ${folderValidation.normalizedPath}` 
      }, 400);
    }
    
    const result = await FileUtils.getFolderDetails(defaultPaths.serversPath, folderValidation.normalizedPath);
    
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 500);
    }
    
    return c.json({ 
      success: true, 
      data: { files: result.data } 
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, 500);
  }
});

// GET /read-file-by-path/:path - Leer archivo por ruta
FilemanagerRouter.get('/read-file-by-path/*', async (c) => {
  try {
    const filePath = c.req.param('*') || c.req.path.split('/read-file-by-path/')[1];
    if (!filePath) {
      return c.json({ success: false, error: 'Ruta de archivo requerida' }, 400);
    }
    
    // Validar la ruta del archivo
    const fileValidation = validatePath(filePath);
    if (!fileValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Ruta de archivo inválida: ${fileValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Construir ruta segura y verificar que existe
    const safePath = createSafePath(fileValidation.normalizedPath,defaultPaths.serversPath);

    if (!(await pathExists(safePath))) {
      return c.json({ 
        success: false, 
        error: `El archivo no existe: ${fileValidation.normalizedPath}` 
      }, 404);
    }
    
    // Verificar que es un archivo y no un directorio
    if (await isDirectory(safePath)) {
      return c.json({ 
        success: false, 
        error: `La ruta especificada es un directorio, no un archivo: ${fileValidation.normalizedPath}` 
      }, 400);
    }
    
    const content = await fs.readFile(safePath, 'utf-8');
    
    return c.json({
      success: true,
      data: {
        content,
        path: fileValidation.normalizedPath,
        size: content.length
      }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al leer archivo' 
    }, 500);
  }
});

// POST /write-file - Escribir archivo
FilemanagerRouter.post('/write-file', async (c) => {
  try {
    const body = await c.req.json();
    const { directoryname, filename, content } = body;
    
    if (!directoryname || !filename || content === undefined) {
      return c.json({ 
        success: false, 
        error: 'directoryname, filename y content son requeridos' 
      }, 400);
    }
    
    // Validar y normalizar las rutas
    const dirValidation = validatePath(directoryname);
    const fileValidation = validatePath(filename);
    
    if (!dirValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Directorio inválido: ${dirValidation.errors.join(', ')}` 
      }, 400);
    }
    
    if (!fileValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de archivo inválido: ${fileValidation.errors.join(', ')}` 
      }, 400);
    }
    
    const result = await FileUtils.writeFile(defaultPaths.serversPath, dirValidation.normalizedPath, fileValidation.normalizedPath, content);
    
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 500);
    }
    
    return c.json({ 
      success: true, 
      message: 'Archivo escrito exitosamente',
      data: { path: result.data }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al escribir archivo' 
    }, 500);
  }
});

// POST /upload-files - Subir archivos
FilemanagerRouter.post('/upload-files', async (c) => {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];
    const directory = formData.get('directory') as string || '';
    
    if (!files || files.length === 0) {
      return c.json({ success: false, error: 'No se encontraron archivos' }, 400);
    }
    
    // Validar el directorio de destino
    let normalizedDirectory = '';
    if (directory) {
      const dirValidation = validatePath(directory);
      if (!dirValidation.isValid) {
        return c.json({ 
          success: false, 
          error: `Directorio inválido: ${dirValidation.errors.join(', ')}` 
        }, 400);
      }
      normalizedDirectory = dirValidation.normalizedPath;
    }
    
    const uploadResults = [];
    
    for (const file of files) {
      if (file instanceof File) {
        // Validar el nombre del archivo
        const fileValidation = validatePath(file.name);
        if (!fileValidation.isValid) {
          uploadResults.push({
            filename: file.name,
            success: false,
            error: `Nombre de archivo inválido: ${fileValidation.errors.join(', ')}`
          });
          continue;
        }
        
        const content = await file.text();
        const result = await FileUtils.writeFile(defaultPaths.serversPath, normalizedDirectory, fileValidation.normalizedPath, content);
        
        uploadResults.push({
          filename: file.name,
          success: result.success,
          error: result.success ? null : result.error
        });
      }
    }
    
    return c.json({ 
      success: true, 
      message: 'Archivos procesados',
      data: { results: uploadResults }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al subir archivos' 
    }, 500);
  }
});

// DELETE /deleteFile/:serverName/:path - Eliminar archivo
FilemanagerRouter.delete('/deleteFile/:serverName/*', async (c) => {
  try {
    const serverName = c.req.param('serverName');
    const filePath = c.req.param('*') || c.req.path.split(`/deleteFile/${serverName}/`)[1];
    
    if (!filePath) {
      return c.json({ success: false, error: 'Ruta de archivo requerida' }, 400);
    }
    
    // Validar el nombre del servidor
    const serverValidation = validatePath(serverName);
    if (!serverValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de servidor inválido: ${serverValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Validar la ruta del archivo
    const fileValidation = validatePath(filePath);
    if (!fileValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Ruta de archivo inválida: ${fileValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Construir la ruta completa: serverName/filePath usando utilidades seguras
    const fullRelativePath = path.join(serverValidation.normalizedPath, fileValidation.normalizedPath);
    const safePath = createSafePath(fullRelativePath,defaultPaths.serversPath);
    
    // Verificar que el archivo/directorio existe antes de intentar eliminarlo
    if (!(await pathExists(safePath))) {
      return c.json({ 
        success: false, 
        error: `El archivo o directorio no existe: ${fullRelativePath}` 
      }, 404);
    }
    
    // Usar la ruta segura para eliminar
    const relativePath = path.relative(defaultPaths.serversPath, safePath);
    const result = await FileUtils.deletePath(defaultPaths.serversPath, relativePath);
    
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 500);
    }
    
    return c.json({ 
      success: true, 
      message: 'Archivo eliminado exitosamente'
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al eliminar archivo' 
    }, 500);
  }
});

// POST /create-folder - Crear carpeta
FilemanagerRouter.post('/create-folder', async (c) => {
  try {
    const body = await c.req.json();
    const { directoryname } = body;
    
    if (!directoryname) {
      return c.json({ 
        success: false, 
        error: 'directoryname es requerido' 
      }, 400);
    }
    
    // Validar el nombre del directorio
    const dirValidation = validatePath(directoryname);
    if (!dirValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de directorio inválido: ${dirValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Verificar que el directorio base existe
    if (!(await pathExists(defaultPaths.serversPath))) {
      return c.json({ 
        success: false, 
        error: `El directorio de servidores no existe: ${defaultPaths.serversPath}` 
      }, 500);
    }
    
    const safePath = createSafePath(dirValidation.normalizedPath,defaultPaths.serversPath);
    
    // Verificar si el directorio ya existe
    if (await pathExists(safePath)) {
      return c.json({ 
        success: false, 
        error: `El directorio ya existe: ${dirValidation.normalizedPath}` 
      }, 409);
    }
    
    await fs.mkdir(safePath, { recursive: true });
    
    return c.json({ 
      success: true, 
      message: 'Carpeta creada exitosamente',
      data: { path: dirValidation.normalizedPath }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al crear carpeta' 
    }, 500);
  }
});

// PUT /rename - Renombrar archivo o carpeta
FilemanagerRouter.put('/rename', async (c) => {
  try {
    const body = await c.req.json();
    const { server, path: filePath, newName } = body;
    
    if (!server || !filePath || !newName) {
      return c.json({ 
        success: false, 
        error: 'server, path y newName son requeridos' 
      }, 400);
    }
    
    // Validar y normalizar las rutas usando utilidades seguras
    const fullPath = path.join(server, filePath);
    const safePath = createSafePath(fullPath,defaultPaths.serversPath);
    
    // Extraer el directorio y el nombre del archivo actual desde la ruta segura
    const relativePath = path.relative(defaultPaths.serversPath, safePath);
    const directory = path.dirname(relativePath);
    const currentName = path.basename(relativePath);
    
    // Validar el nuevo nombre
    const nameValidation = validatePath(newName);
    if (!nameValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre inválido: ${nameValidation.errors.join(', ')}` 
      }, 400);
    }
    
    const result = await FileUtils.renameFile(defaultPaths.serversPath, directory, currentName, newName);
    
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 500);
    }
    
    return c.json({ 
      success: true, 
      message: 'Archivo renombrado exitosamente',
      data: { newPath: result.data }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al renombrar archivo' 
    }, 500);
  }
});

// GET /download/:serverName/* - Download any file from servers directory
FilemanagerRouter.get('/download/:serverName/*', async (c) => {
  try {
    const serverName = c.req.param('serverName');
    const filePath = c.req.param('*') || c.req.path.split(`/download/${serverName}/`)[1];
    
    if (!filePath) {
      return c.json({ success: false, error: 'Ruta de archivo requerida' }, 400);
    }
    
    // Validar el nombre del servidor
    const serverValidation = validatePath(serverName);
    if (!serverValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de servidor inválido: ${serverValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Validar la ruta del archivo
    const fileValidation = validatePath(filePath);
    if (!fileValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Ruta de archivo inválida: ${fileValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Construir la ruta completa: serverName/filePath usando utilidades seguras
    const fullRelativePath = path.join(serverValidation.normalizedPath, fileValidation.normalizedPath);
    const safePath = createSafePath(fullRelativePath,defaultPaths.serversPath);
    
    // Verificar que el archivo existe antes de intentar descargarlo
    if (!(await pathExists(safePath))) {
      return c.json({ 
        success: false, 
        error: `El archivo no existe: ${fullRelativePath}` 
      }, 404);
    }
    
    // Verificar que es un archivo y no un directorio
    if (await isDirectory(safePath)) {
      return c.json({ 
        success: false, 
        error: `La ruta especificada es un directorio, no un archivo: ${fullRelativePath}` 
      }, 400);
    }
    
    // Obtener estadísticas del archivo
    try {
      const fileStats = await stat(safePath);
      
      // Determinar el tipo de contenido basado en la extensión del archivo
      const ext = extname(safePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      // Mapear extensiones comunes a tipos MIME
      const mimeTypes: { [key: string]: string } = {
        '.txt': 'text/plain',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.ts': 'application/typescript',
        '.md': 'text/markdown',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
        '.tar': 'application/x-tar',
        '.gz': 'application/gzip',
        '.jar': 'application/java-archive',
        '.properties': 'text/plain',
        '.yml': 'text/yaml',
        '.yaml': 'text/yaml',
        '.log': 'text/plain'
      };
      
      if (mimeTypes[ext]) {
        contentType = mimeTypes[ext];
      }
      
      // Obtener el nombre del archivo para la descarga
      const fileName = path.basename(safePath);
      
      // Configurar headers para la descarga del archivo
      c.header('Content-Disposition', `attachment; filename="${fileName}"`);
      c.header('Content-Type', contentType);
      c.header('Content-Length', fileStats.size.toString());
      c.header('Cache-Control', 'no-cache');
      
      // Crear y retornar el stream del archivo usando el helper de streaming de Hono
      return stream(c, async (stream) => {
        const fileStream = createReadStream(safePath);
        
        // Convertir Node.js ReadStream a Web API ReadableStream
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
      return c.json({ 
        success: false, 
        error: 'Archivo no encontrado o inaccesible' 
      }, 404);
    }
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al descargar archivo' 
    }, 500);
  }
});

export default FilemanagerRouter;
