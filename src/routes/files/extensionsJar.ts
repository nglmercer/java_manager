import { Hono } from "hono";
import path from "path";
import { FileUtils } from "../../utils/file.utils.js";
import { defaultPaths } from "../../config.js";
import { PathUtils } from "../../utils/path-utils.js";
import fs from "node:fs/promises";

const extensionsJarRouter = new Hono();

// Usar las utilidades de rutas mejoradas
const { createSafePath, validatePath, pathExists, isDirectory } = PathUtils;

// Tipos de extensiones soportadas
type ExtensionType = 'plugins' | 'mods';
type ExtensionOperation = 'enable' | 'disable' | 'delete';

// Validar tipo de extensión
function validateExtensionType(type: string): type is ExtensionType {
  return type === 'plugins' || type === 'mods';
}

// Validar operación
function validateOperation(operation: string): operation is ExtensionOperation {
  return ['enable', 'disable', 'delete'].includes(operation);
}

// GET /:type/:serverName - Obtener lista de plugins o mods de un servidor
extensionsJarRouter.get('/:type/:serverName', async (c) => {
  try {
    const type = c.req.param('type');
    const serverName = c.req.param('serverName');
    
    // Validar tipo de extensión
    if (!validateExtensionType(type)) {
      return c.json({ 
        success: false, 
        error: `Tipo de extensión inválido: ${type}. Debe ser 'plugins' o 'mods'` 
      }, 400);
    }
    
    // Validar el nombre del servidor
    const serverValidation = validatePath(serverName);
    if (!serverValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de servidor inválido: ${serverValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Construir ruta del directorio de extensiones
    const extensionsPath = path.join(defaultPaths.serversPath, serverValidation.normalizedPath, type);
    
    // Verificar que el directorio existe
    if (!(await pathExists(extensionsPath))) {
      return c.json({ 
        success: false, 
        error: `El directorio de ${type} no existe para el servidor: ${serverValidation.normalizedPath}` 
      }, 404);
    }
    
    if (!(await isDirectory(extensionsPath))) {
      return c.json({ 
        success: false, 
        error: `La ruta especificada no es un directorio: ${type}` 
      }, 400);
    }
    
    // Obtener archivos .jar del directorio
    const files = await fs.readdir(extensionsPath);
    const jarFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.jar' || ext === '.disabled';
    });
    
    const extensionsList = jarFiles.map(file => {
      const isDisabled = file.endsWith('.disabled');
      const name = isDisabled ? file.replace('.disabled', '') : file;
      const baseName = path.basename(name, '.jar');
      
      return {
        name: baseName,
        filename: file,
        enabled: !isDisabled,
        size: 0, // Se puede calcular si es necesario
        type: type.slice(0, -1) // 'plugins' -> 'plugin', 'mods' -> 'mod'
      };
    });
    
    return c.json({ 
      success: true, 
      data: extensionsList
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, 500);
  }
});

// GET /:type/:serverName/:itemName/:operation - Realizar operación en plugin/mod
extensionsJarRouter.get('/:type/:serverName/:itemName/:operation', async (c) => {
  try {
    const type = c.req.param('type');
    const serverName = c.req.param('serverName');
    const itemName = c.req.param('itemName');
    const operation = c.req.param('operation');
    
    // Validaciones
    if (!validateExtensionType(type)) {
      return c.json({ 
        success: false, 
        error: `Tipo de extensión inválido: ${type}` 
      }, 400);
    }
    
    if (!validateOperation(operation)) {
      return c.json({ 
        success: false, 
        error: `Operación inválida: ${operation}. Operaciones válidas: enable, disable, delete` 
      }, 400);
    }
    
    // Validar nombres
    const serverValidation = validatePath(serverName);
    const itemValidation = validatePath(itemName);
    
    if (!serverValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de servidor inválido: ${serverValidation.errors.join(', ')}` 
      }, 400);
    }
    
    if (!itemValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de item inválido: ${itemValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Construir rutas - extraer nombre base del archivo
    const extensionsPath = path.join(defaultPaths.serversPath, serverValidation.normalizedPath, type);
    
    // Extraer el nombre base: si termina con .jar seguido de algo, remover desde .jar
    let cleanItemName = itemValidation.normalizedPath;
    const jarIndex = cleanItemName.indexOf('.jar');
    if (jarIndex !== -1) {
      cleanItemName = cleanItemName.substring(0, jarIndex);
    }
    
    const jarFile = `${cleanItemName}.jar`;
    const disabledFile = `${cleanItemName}.jar.disabled`;
    const jarPath = path.join(extensionsPath, jarFile);
    const disabledPath = path.join(extensionsPath, disabledFile);
    
    // Verificar que el directorio existe
    if (!(await pathExists(extensionsPath))) {
      return c.json({ 
        success: false, 
        error: `El directorio de ${type} no existe` 
      }, 404);
    }
    
    let currentPath: string;
    let targetPath: string;
    let isCurrentlyEnabled: boolean;
    
    // Determinar estado actual del archivo
    if (await pathExists(jarPath)) {
      currentPath = jarPath;
      isCurrentlyEnabled = true;
    } else if (await pathExists(disabledPath)) {
      currentPath = disabledPath;
      isCurrentlyEnabled = false;
    } else {
      return c.json({ 
        success: false, 
        error: `El ${type.slice(0, -1)} '${itemValidation.normalizedPath}' no existe` 
      }, 404);
    }
    
    // Ejecutar operación
    switch (operation) {
      case 'enable':
        if (isCurrentlyEnabled) {
          return c.json({ 
            success: false, 
            error: `El ${type.slice(0, -1)} ya está habilitado` 
          }, 400);
        }
        targetPath = jarPath;
        await fs.rename(currentPath, targetPath);
        break;
        
      case 'disable':
        if (!isCurrentlyEnabled) {
          return c.json({ 
            success: false, 
            error: `El ${type.slice(0, -1)} ya está deshabilitado` 
          }, 400);
        }
        targetPath = disabledPath;
        await fs.rename(currentPath, targetPath);
        break;
        
      case 'delete':
        await fs.unlink(currentPath);
        break;
    }
    
    return c.json({ 
      success: true, 
      message: `${type.slice(0, -1)} ${operation === 'delete' ? 'eliminado' : operation === 'enable' ? 'habilitado' : 'deshabilitado'} exitosamente`
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error en la operación' 
    }, 500);
  }
});

// POST /upload/:type/:serverName - Subir archivo .jar
extensionsJarRouter.post('/upload/:type/:serverName', async (c) => {
  try {
    const type = c.req.param('type');
    const serverName = c.req.param('serverName');
    
    // Validaciones
    if (!validateExtensionType(type)) {
      return c.json({ 
        success: false, 
        error: `Tipo de extensión inválido: ${type}` 
      }, 400);
    }
    
    const serverValidation = validatePath(serverName);
    if (!serverValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de servidor inválido: ${serverValidation.errors.join(', ')}` 
      }, 400);
    }
    
    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return c.json({ success: false, error: 'No se encontraron archivos' }, 400);
    }
    
    // Construir ruta del directorio
    const extensionsPath = path.join(defaultPaths.serversPath, serverValidation.normalizedPath, type);
    
    // Crear directorio si no existe
    if (!(await pathExists(extensionsPath))) {
      await fs.mkdir(extensionsPath, { recursive: true });
    }
    
    const uploadResults = [];
    
    for (const file of files) {
      if (file instanceof File) {
        // Validar que sea un archivo .jar
        if (!file.name.toLowerCase().endsWith('.jar')) {
          uploadResults.push({
            filename: file.name,
            success: false,
            error: 'Solo se permiten archivos .jar'
          });
          continue;
        }
        
        // Validar nombre del archivo
        const fileValidation = validatePath(file.name);
        if (!fileValidation.isValid) {
          uploadResults.push({
            filename: file.name,
            success: false,
            error: `Nombre de archivo inválido: ${fileValidation.errors.join(', ')}`
          });
          continue;
        }
        
        try {
          const filePath = path.join(extensionsPath, fileValidation.normalizedPath);
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          await fs.writeFile(filePath, buffer);
          
          uploadResults.push({
            filename: file.name,
            success: true,
            error: null
          });
        } catch (error) {
          uploadResults.push({
            filename: file.name,
            success: false,
            error: error instanceof Error ? error.message : 'Error al subir archivo'
          });
        }
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

// POST /download-file - Descargar archivo desde URL
extensionsJarRouter.post('/download-file', async (c) => {
  try {
    const body = await c.req.json();
    const { server, url, path: extensionType } = body;
    
    if (!server || !url || !extensionType) {
      return c.json({ 
        success: false, 
        error: 'server, url y path son requeridos' 
      }, 400);
    }
    
    // Validar tipo de extensión
    if (!validateExtensionType(extensionType)) {
      return c.json({ 
        success: false, 
        error: `Tipo de extensión inválido: ${extensionType}` 
      }, 400);
    }
    
    // Validar servidor
    const serverValidation = validatePath(server);
    if (!serverValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de servidor inválido: ${serverValidation.errors.join(', ')}` 
      }, 400);
    }
    
    // Validar URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return c.json({ 
        success: false, 
        error: 'URL inválida' 
      }, 400);
    }
    
    // Construir ruta de destino
    const extensionsPath = path.join(defaultPaths.serversPath, serverValidation.normalizedPath, extensionType);
    
    // Crear directorio si no existe
    if (!(await pathExists(extensionsPath))) {
      await fs.mkdir(extensionsPath, { recursive: true });
    }
    
    // Obtener nombre del archivo desde la URL
    const fileName = path.basename(parsedUrl.pathname) || `downloaded-${Date.now()}.jar`;
    
    // Asegurar que tenga extensión .jar
    const finalFileName = fileName.toLowerCase().endsWith('.jar') ? fileName : `${fileName}.jar`;
    
    // Validar nombre del archivo
    const fileValidation = validatePath(finalFileName);
    if (!fileValidation.isValid) {
      return c.json({ 
        success: false, 
        error: `Nombre de archivo inválido: ${fileValidation.errors.join(', ')}` 
      }, 400);
    }
    
    const filePath = path.join(extensionsPath, fileValidation.normalizedPath);
    
    // Descargar archivo
    const response = await fetch(url);
    if (!response.ok) {
      return c.json({ 
        success: false, 
        error: `Error al descargar archivo: ${response.status} ${response.statusText}` 
      }, 400);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.writeFile(filePath, buffer);
    
    return c.json({ 
      success: true, 
      message: 'Archivo descargado exitosamente',
      data: { 
        filename: fileValidation.normalizedPath,
        path: path.relative(defaultPaths.serversPath, filePath),
        size: buffer.length
      }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al descargar archivo' 
    }, 500);
  }
});

export default extensionsJarRouter;

