import { Hono } from "hono";
import { defaultLogger as logger } from "../../logger/index.js";
import { defaultPaths } from "../../config.js";
import { getCoreVersionURL, getCoreVersions } from "../../core/mc/coredownloader.js";
import { serverManager } from "../../core/mc/ServerManager.js";
import { minecraftServerManager } from "../../core/server/serverFiles.js";
import { findJavaVersion } from "../../services/java-installations.js";
import { getPlatformInfo } from "../../core/server/serverconfig.js";
import { FileUtils } from "../../utils/file.utils.js";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const generationRouter = new Hono();

// Interfaz para los datos del servidor
interface ServerData {
  serverName: string;
  fileName?: string;
  javaVersion: string;
  Ramsize: string;
  serverPort: string;
  optiflags: string;
  coreName: string;
  coreVersion: string;
  startParameters: string;
}

// Ruta POST para manejar la generación de servidores
generationRouter.post('/newserver', async (c) => {
  try {
    const body = await c.req.parseBody();
    
    // Extraer datos JSON del formulario
    let serverData: ServerData;
    
    if (body.jsonData) {
      try {
        serverData = JSON.parse(body.jsonData as string);
      } catch (error) {
        logger.error('Error parsing JSON data:', error);
        return c.json({ error: 'Invalid JSON data format' }, 400);
      }
    } else {
      // Si no hay jsonData, intentar extraer campos individuales
      serverData = {
        serverName: body.serverName as string || '',
        fileName: body.fileName as string || '',
        javaVersion: body.javaVersion as string || '',
        Ramsize: body.Ramsize as string || '',
        serverPort: body.serverPort as string || '',
        optiflags: body.optiflags as string || '',
        coreName: body.coreName as string || '',
        coreVersion: body.coreVersion as string || '',
        startParameters: body.startParameters as string || ''
      };
    }

    // Validar datos requeridos
    if (!serverData.serverName || !serverData.javaVersion || !serverData.coreName) {
      return c.json({ 
        error: 'Missing required fields: serverName, javaVersion, and coreName are required' 
      }, 400);
    }

    // Manejar archivos subidos (si existen)
    const uploadedFiles: { [key: string]: File } = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (value instanceof File) {
        uploadedFiles[key] = value;
        logger.info(`File uploaded: ${key} - ${value.name} (${value.size} bytes)`);
      }
    }

    // Log de los datos recibidos
    logger.info('Server generation request received:', {
      serverData,
      filesCount: Object.keys(uploadedFiles).length
    });

// Ruta POST específica para crear servidor con archivo subido
generationRouter.post('/newserverbyfile', async (c) => {
  try {
    const body = await c.req.parseBody();
    
    // Extraer datos JSON del formulario
    let serverData: ServerData;
    
    if (body.jsonData) {
      try {
        serverData = JSON.parse(body.jsonData as string);
      } catch (error) {
        logger.error('Error parsing JSON data:', error);
        return c.json({ error: 'Invalid JSON data format' }, 400);
      }
    } else {
      return c.json({ error: 'JSON data is required' }, 400);
    }

    // Validar datos requeridos (sin coreVersion para archivo subido)
    if (!serverData.serverName || !serverData.javaVersion) {
      return c.json({ 
        error: 'Missing required fields: serverName and javaVersion are required' 
      }, 400);
    }

    // Verificar que se subió un archivo
    const uploadedFile = body.file as File;
    if (!uploadedFile) {
      return c.json({ 
        error: 'Core file is required for this endpoint' 
      }, 400);
    }

    // Validar que el archivo es un JAR
    if (!uploadedFile.name.toLowerCase().endsWith('.jar')) {
      return c.json({ 
        error: 'Only JAR files are allowed for server cores' 
      }, 400);
    }

    logger.info('Server creation with file upload request received:', {
      serverData,
      fileName: uploadedFile.name,
      fileSize: uploadedFile.size
    });

    // Validar que Java esté instalado
    const javaInfo = await findJavaVersion(defaultPaths.unpackPath, Number(serverData.javaVersion));
    if (!javaInfo) {
      return c.json({ 
        error: `Java version ${serverData.javaVersion} is not installed. Please install it first.` 
      }, 400);
    }

    // Crear directorio del servidor
    const serverPath = path.join(defaultPaths.serversPath, serverData.serverName);
    
    try {
      await fs.mkdir(serverPath, { recursive: true });
    } catch (error) {
      logger.error('Error creating server directory:', error);
      return c.json({ error: 'Failed to create server directory' }, 500);
    }

    // Guardar archivo subido
    const coreFilePath = path.join(serverPath, uploadedFile.name);
    
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      await fs.writeFile(coreFilePath, Buffer.from(arrayBuffer));
      logger.info(`Core file uploaded: ${uploadedFile.name}`);
    } catch (error) {
      logger.error('Error saving uploaded core file:', error);
      return c.json({ error: 'Failed to save uploaded core file' }, 500);
    }

    // Generar script de inicio
    const platformInfo = getPlatformInfo();
    const javaPath = path.join(javaInfo.installPath, 'bin', platformInfo.isWindows ? 'java.exe' : 'java');
    const coreFileName = path.basename(coreFilePath);
    
    const startCommand = `"${javaPath}" -Xmx${serverData.Ramsize} -Xms${serverData.Ramsize} ${serverData.optiflags || ''} -jar "${coreFileName}" nogui`;
    
    const startScriptContent = platformInfo.isWindows 
      ? `@echo off\necho Starting Minecraft Server...\n${startCommand}\npause`
      : `#!/bin/bash\necho "Starting Minecraft Server..."\n${startCommand}`;
    
    const startScriptPath = path.join(serverPath, platformInfo.startScript);
    
    try {
      await fs.writeFile(startScriptPath, startScriptContent);
      if (!platformInfo.isWindows) {
        await fs.chmod(startScriptPath, 0o755);
      }
      logger.info(`Start script created: ${platformInfo.startScript}`);
    } catch (error) {
      logger.error('Error creating start script:', error);
      return c.json({ error: 'Failed to create start script' }, 500);
    }

    // Crear server.properties
    const serverProperties = [
      `server-port=${serverData.serverPort || '25565'}`,
      'gamemode=survival',
      'difficulty=easy',
      'allow-nether=true',
      'spawn-monsters=true',
      'online-mode=true',
      'pvp=true',
      'level-name=world',
      'motd=A Minecraft Server',
      'max-players=20'
    ].join('\n');
    
    try {
      await fs.writeFile(path.join(serverPath, 'server.properties'), serverProperties);
      logger.info('server.properties created');
    } catch (error) {
      logger.error('Error creating server.properties:', error);
    }

    // Crear eula.txt
    const eulaContent = `#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://account.mojang.com/documents/minecraft_eula).\neula=true`;
    
    try {
      await fs.writeFile(path.join(serverPath, 'eula.txt'), eulaContent);
      logger.info('eula.txt created');
    } catch (error) {
      logger.error('Error creating eula.txt:', error);
    }

    // Registrar servidor en el manager
    try {
      const server = serverManager.addServer(serverData.serverName, serverPath,{});
      
      await minecraftServerManager.initialize();
      await minecraftServerManager.scanAndMapServers();
      
      logger.info(`Server '${serverData.serverName}' registered successfully`);
    } catch (error) {
      logger.error('Error registering server:', error);
    }
    
    // Respuesta exitosa
    return c.json({
      success: true,
      message: `Server '${serverData.serverName}' created successfully with uploaded core`,
      data: {
        serverName: serverData.serverName,
        serverPath,
        coreFile: uploadedFile.name,
        coreFileSize: uploadedFile.size,
        javaVersion: serverData.javaVersion,
        javaPath,
        startScript: platformInfo.startScript,
        serverPort: serverData.serverPort || '25565'
      }
    });

  } catch (error) {
    logger.error('Error processing server creation with file upload:', error);
    return c.json({ 
      error: 'Internal server error while processing request' 
    }, 500);
  }
});

    // Validar que Java esté instalado
    const javaInfo = await findJavaVersion(defaultPaths.unpackPath, Number(serverData.javaVersion));
    if (!javaInfo) {
      return c.json({ 
        error: `Java version ${serverData.javaVersion} is not installed. Please install it first.` 
      }, 400);
    }

    // Crear directorio del servidor
    const serverPath = path.join(defaultPaths.serversPath, serverData.serverName);
    
    try {
      await fs.mkdir(serverPath, { recursive: true });
    } catch (error) {
      logger.error('Error creating server directory:', error);
      return c.json({ error: 'Failed to create server directory' }, 500);
    }

    let coreFilePath: string;
    
    // Manejar descarga de core o archivo subido
    if (Object.keys(uploadedFiles).length > 0 && uploadedFiles.file) {
      // Usar archivo subido
      const uploadedFile = uploadedFiles.file;
      coreFilePath = path.join(serverPath, uploadedFile.name);
      
      try {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        await fs.writeFile(coreFilePath, Buffer.from(arrayBuffer));
        logger.info(`Core file uploaded: ${uploadedFile.name}`);
      } catch (error) {
        logger.error('Error saving uploaded core file:', error);
        return c.json({ error: 'Failed to save uploaded core file' }, 500);
      }
    } else {
      // Descargar core desde URL
      if (!serverData.coreVersion) {
        return c.json({ 
          error: 'Core version is required when not uploading a file' 
        }, 400);
      }
      
      const coreUrl = await getCoreVersionURL(serverData.coreName, serverData.coreVersion);
      if (!coreUrl) {
        return c.json({ 
          error: `Failed to get download URL for ${serverData.coreName} version ${serverData.coreVersion}` 
        }, 400);
      }
      
      const coreFileName = `${serverData.coreName}-${serverData.coreVersion}.jar`;
      coreFilePath = path.join(serverPath, coreFileName);
      
      try {
        const response = await fetch(coreUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const fileStream = createWriteStream(coreFilePath);
        await pipeline(response.body!, fileStream);
        logger.info(`Core downloaded: ${coreFileName}`);
      } catch (error) {
        logger.error('Error downloading core:', error);
        return c.json({ error: 'Failed to download server core' }, 500);
      }
    }

    // Generar script de inicio
    const platformInfo = getPlatformInfo();
    const javaPath = path.join(javaInfo.installPath, 'bin', platformInfo.isWindows ? 'java.exe' : 'java');
    const coreFileName = path.basename(coreFilePath);
    
    const startCommand = `"${javaPath}" -Xmx${serverData.Ramsize} -Xms${serverData.Ramsize} ${serverData.optiflags || ''} -jar "${coreFileName}" nogui`;
    
    const startScriptContent = platformInfo.isWindows 
      ? `@echo off\necho Starting Minecraft Server...\n${startCommand}\npause`
      : `#!/bin/bash\necho "Starting Minecraft Server..."\n${startCommand}`;
    
    const startScriptPath = path.join(serverPath, platformInfo.startScript);
    
    try {
      await fs.writeFile(startScriptPath, startScriptContent);
      if (!platformInfo.isWindows) {
        await fs.chmod(startScriptPath, 0o755); // Make executable on Unix systems
      }
      logger.info(`Start script created: ${platformInfo.startScript}`);
    } catch (error) {
      logger.error('Error creating start script:', error);
      return c.json({ error: 'Failed to create start script' }, 500);
    }

    // Crear server.properties
    const serverProperties = [
      `server-port=${serverData.serverPort || '25565'}`,
      'gamemode=survival',
      'difficulty=easy',
      'allow-nether=true',
      'spawn-monsters=true',
      'online-mode=true',
      'pvp=true',
      'level-name=world',
      'motd=A Minecraft Server',
      'max-players=20'
    ].join('\n');
    
    try {
      await fs.writeFile(path.join(serverPath, 'server.properties'), serverProperties);
      logger.info('server.properties created');
    } catch (error) {
      logger.error('Error creating server.properties:', error);
    }

    // Crear eula.txt
    const eulaContent = `#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://account.mojang.com/documents/minecraft_eula).\neula=true`;
    
    try {
      await fs.writeFile(path.join(serverPath, 'eula.txt'), eulaContent);
      logger.info('eula.txt created');
    } catch (error) {
      logger.error('Error creating eula.txt:', error);
    }

    // Registrar servidor en el manager
    try {
      const server = serverManager.addServer(serverData.serverName, serverPath, {});
      
      // También registrar en el sistema de archivos
      await minecraftServerManager.initialize();
      await minecraftServerManager.scanAndMapServers();
      
      logger.info(`Server '${serverData.serverName}' registered successfully`);
    } catch (error) {
      logger.error('Error registering server:', error);
      // No fallar aquí, el servidor se creó correctamente
    }
    
    // Respuesta exitosa
    return c.json({
      success: true,
      message: `Server '${serverData.serverName}' created successfully`,
      data: {
        serverName: serverData.serverName,
        serverPath,
        coreFile: path.basename(coreFilePath),
        javaVersion: serverData.javaVersion,
        javaPath,
        startScript: platformInfo.startScript,
        serverPort: serverData.serverPort || '25565'
      }
    });

  } catch (error) {
    logger.error('Error processing server generation request:', error);
    return c.json({ 
      error: 'Internal server error while processing request' 
    }, 500);
  }
});

// Ruta GET para obtener información sobre el endpoint
generationRouter.get('/info', (c) => {
  return c.json({
    endpoint: '/generate',
    method: 'POST',
    description: 'Generate Minecraft server configuration',
    acceptedFormats: ['multipart/form-data'],
    requiredFields: ['serverName', 'javaVersion', 'coreName'],
    optionalFields: ['fileName', 'Ramsize', 'serverPort', 'optiflags', 'coreVersion', 'startParameters'],
    fileUploads: 'Supported (any field with File type)'
  });
});

export { generationRouter };
