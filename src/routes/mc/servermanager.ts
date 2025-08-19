import { Hono } from "hono";
import { minecraftServerManager } from '../../core/server/serverFiles.js';

import { defaultLogger as logger } from "../../logger/index.js";
const manager = minecraftServerManager;

const servermanager = new Hono();

// Variable para controlar el estado de inicialización
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Función para asegurar que el manager esté inicializado
async function ensureInitialized(): Promise<void> {
  if (isInitialized) {
    return;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = (async () => {
    try {
      console.log('🎮 === INICIALIZANDO SISTEMA DE GESTIÓN DE SERVIDORES ===');
      await manager.initialize();
      
      // Escanear y mapear todos los servidores
      const servers = await manager.scanAndMapServers();
      console.log(`✅ Sistema inicializado: ${servers.length} servidores encontrados`);
      
      // Inicializar servidores en el manager de control
      await manager.initializeServersInManager();
      console.log('🎮 Servidores agregados al sistema de control');
      
      isInitialized = true;
    } catch (error) {
      console.error('❌ Error inicializando el sistema:', error);
      throw error;
    }
  })();
  
  return initializationPromise;
}

// Obtener información de un servidor específico
servermanager.get('/:server/info', async (c) => {
  const serverName = c.req.param('server');
  
  try {
    // Asegurar que el sistema esté inicializado
    await ensureInitialized();
    
    // Buscar el servidor por ID o nombre
    let server = await manager.getServerByName(serverName);

    if (!server) {
      // Si no se encuentra, intentar escanear nuevamente
      console.log(`Servidor '${serverName}' no encontrado, reescaneando...`);
      await manager.scanAndMapServers();
      server = await manager.getServerByName(serverName);
      
      if (!server) {
        return c.json({ error: 'Servidor no encontrado' }, 404);
      }
    }
    const status = manager.getServerStatus(serverName);
    server.status = status || "stopped";

    // Retornar información del servidor usando los datos del MinecraftServerManager
    return c.json({data:server,success:true});
  } catch (error) {
    logger.error(`Error obteniendo información del servidor ${serverName}:`, error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// Obtener todos los servidores
servermanager.get('/all', async (c) => {
  try {
    // Asegurar que el sistema esté inicializado
    await ensureInitialized();
        
    console.log('Obteniendo lista de servidores...');
    await manager.scanAndMapServers();
    const updatedServers = await manager.getAllServers();
    return c.json({ success: true, data: updatedServers, scanned: true });
  } catch (error) {
    console.error('Error obteniendo servidores:', error);
    return c.json({ success: false, error: 'Error interno del servidor' }, 500);
  }
});

// Ruta para obtener logs de un servidor
servermanager.get('/:server/log', async (c) => {
  const serverName = c.req.param('server');
  const lines = c.req.query('lines');
  
  try {
    await ensureInitialized();
    
    const server = await manager.getServerByName(serverName);
    if (!server) {
      return c.json({ error: 'Servidor no encontrado' }, 404);
    }

    const logLines = lines ? parseInt(lines) : undefined;
    const logs = manager.getServerLogs(serverName, logLines);
    
    return c.json({ success: true, data: logs });
  } catch (error) {
    logger.error(`Error obteniendo logs del servidor ${serverName}:`, error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// Ruta para acciones del servidor
servermanager.get('/:server/:action', async (c) => {
  const serverName = c.req.param('server');
  const action = c.req.param('action');
  const validActions = ['start', 'stop', 'restart', 'kill', 'send'];

  if (!validActions.includes(action)) {
    return c.json({ success: false, error: 'Acción no válida' }, 400);
  }

  try {
    await ensureInitialized();
    
    const server = await manager.getServerByName(serverName);
    if (!server) {
      return c.json({ error: 'Servidor no encontrado' }, 404);
    }

    let result = false;
    let message = '';

    switch (action) {
      case 'start':
        result = manager.startServer(serverName);
        message = result ? 'Servidor iniciado' : 'No se pudo iniciar el servidor';
        break;
      
      case 'stop':
        result = manager.stopServer(serverName);
        message = result ? 'Servidor detenido' : 'No se pudo detener el servidor';
        break;
      
      case 'restart':
        result = manager.restartServer(serverName);
        message = result ? 'Servidor reiniciado' : 'No se pudo reiniciar el servidor';
        break;
      
      case 'kill':
        result = manager.killServer(serverName);
        message = result ? 'Servidor terminado forzosamente' : 'No se pudo terminar el servidor';
        break;
      
      case 'send':
        const body = await c.req.json();
        const command = body?.command;
        
        if (!command || typeof command !== 'string') {
          return c.json({ success: false, error: 'Comando requerido en el body' }, 400);
        }
        
        result = manager.sendCommand(serverName, command);
        message = result ? `Comando '${command}' enviado` : 'No se pudo enviar el comando';
        break;
    }

    return c.json({ 
      success: result, 
      message,
      action,
      server: serverName 
    });
    
  } catch (error) {
    logger.error(`Error ejecutando acción ${action} en servidor ${serverName}:`, error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// Ruta para limpiar logs de un servidor
servermanager.delete('/:server/logs', async (c) => {
  const serverName = c.req.param('server');
  
  try {
    await ensureInitialized();
    
    const server = await manager.getServerByName(serverName);
    if (!server) {
      return c.json({ error: 'Servidor no encontrado' }, 404);
    }

    const result = manager.clearServerLogs(serverName);
    
    return c.json({ 
      success: result, 
      message: result ? 'Logs limpiados' : 'No se pudieron limpiar los logs'
    });
  } catch (error) {
    logger.error(`Error limpiando logs del servidor ${serverName}:`, error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// Ruta para obtener métricas de un servidor
servermanager.get('/:server/metrics', async (c) => {
  const serverName = c.req.param('server');
  
  try {
    await ensureInitialized();
    
    const server = await manager.getServerByName(serverName);
    if (!server) {
      return c.json({ error: 'Servidor no encontrado' }, 404);
    }

    const metrics = manager.getServerMetrics(serverName);
    
    return c.json({ success: true, data: metrics });
  } catch (error) {
    logger.error(`Error obteniendo métricas del servidor ${serverName}:`, error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

export { servermanager };
