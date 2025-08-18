import { Hono } from "hono";
import { minecraftServerManager } from '../../core/server/serverFiles.js';
const serverInfoRouter = new Hono();

// Usar la instancia singleton del manager
const manager = minecraftServerManager;

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
      
      isInitialized = true;
    } catch (error) {
      console.error('❌ Error inicializando el sistema:', error);
      throw error;
    }
  })();
  
  return initializationPromise;
}

serverInfoRouter.get('/', async (c) => {
  try {
    // Asegurar que el sistema esté inicializado
    await ensureInitialized();
    
    // Obtener servidores actualizados
    const servers = await manager.getAllServers();
    
    console.log('No hay servidores almacenados, escaneando...');
    await manager.scanAndMapServers();
    const updatedServers = await manager.getAllServers();
    return c.json({ success: true, data: updatedServers, scanned: true });
  } catch (error) {
    console.error('Error obteniendo servidores:', error);
    return c.json({ success: false, error: 'Error interno del servidor' }, 500);
  }
});
serverInfoRouter.get('/:name', async (c) => {
  try {
    // Asegurar que el sistema esté inicializado
    await ensureInitialized();
    
    const name = c.req.param('name');
    const server = await manager.getServerById(name);
    
    if (server) {
      return c.json({ success: true, data: server });
    } else {
      // Si no se encuentra, intentar escanear nuevamente
      console.log(`Servidor '${name}' no encontrado, reescaneando...`);
      await manager.scanAndMapServers();
      const updatedServer = await manager.getServerById(name);
      
      if (updatedServer) {
        return c.json({ success: true, data: updatedServer, rescanned: true });
      } else {
        return c.json({ success: false, error: 'Servidor no encontrado' }, 404);
      }
    }
  } catch (error) {
    console.error('Error obteniendo servidor:', error);
    return c.json({ success: false, error: 'Error interno del servidor' }, 500);
  }
});

// Ruta para forzar un nuevo escaneo
serverInfoRouter.post('/scan', async (c) => {
  try {
    // Asegurar que el sistema esté inicializado
    await ensureInitialized();
    
    console.log('🔄 Iniciando escaneo manual de servidores...');
    const servers = await manager.scanAndMapServers();
    const stats = await manager.getServerStats();
    
    return c.json({ 
      success: true, 
      message: 'Escaneo completado exitosamente',
      data: {
        servers,
        stats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error durante el escaneo manual:', error);
    return c.json({ success: false, error: 'Error durante el escaneo' }, 500);
  }
});

// Ruta para obtener estadísticas de servidores
serverInfoRouter.get('/stats/summary', async (c) => {
  try {
    // Asegurar que el sistema esté inicializado
    await ensureInitialized();
    
    const stats = await manager.getServerStats();
    const servers = await manager.getAllServers();
    
    // Calcular estadísticas adicionales de tamaño
    const totalServerSize = servers.reduce((sum, server) => 
      sum + (server.totalSize || 0), 0
    );
    const averageServerSize = servers.length > 0 ? totalServerSize / servers.length : 0;
    
    const enhancedStats = {
      ...stats,
      totalServerSize,
      averageServerSize,
      serversWithSize: servers.filter(s => s.totalSize).length
    };
    
    return c.json({ success: true, data: enhancedStats });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return c.json({ success: false, error: 'Error obteniendo estadísticas' }, 500);
  }
});

export {serverInfoRouter}
