import { Hono } from "hono";
import { defaultLogger as logger } from "../../logger/index.js";

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

    // TODO: Implementar lógica de generación del servidor
    // Por ahora solo registramos los datos
    
    // Respuesta exitosa
    return c.json({
      success: true,
      message: 'Server data received successfully',
      data: {
        serverConfig: serverData,
        uploadedFiles: Object.keys(uploadedFiles).map(key => ({
          fieldName: key,
          fileName: uploadedFiles[key].name,
          fileSize: uploadedFiles[key].size,
          fileType: uploadedFiles[key].type
        }))
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
