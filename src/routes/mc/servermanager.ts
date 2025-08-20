import { Hono } from "hono";
import { minecraftServerManager } from '../../core/server/serverFiles.js';
import { defaultLogger as logger } from "../../logger/index.js";
import {
  READ_ONLY_ACTIONS,
  MODIFYING_ACTIONS,
  SERVER_CONTROL_ACTIONS,
  COMMAND_ACTIONS,
  LOG_ACTIONS,
  isReadOnlyAction,
  isModifyingAction,
  isServerControlAction,
  isCommandAction,
  type ReadOnlyAction,
  type ModifyingAction,
  type ServerControlAction,
  type CommandActionType,
  type LogAction,
  type AllowedAction,
  type ApiResponse
} from './types.js';

const manager = minecraftServerManager;
const servermanager = new Hono();

// Función helper para crear respuestas estandarizadas
function createResponse<T>(
  success: boolean,
  data?: T,
  message: string | any ='',
  error: string | any ='',
  action?: string,
  server?: string
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  if (error) response.error = error;
  if (action) response.action = action;
  if (server) response.server = server;
  
  return response;
}

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

// ===== RUTAS GET (Solo lectura) =====

/**
 * GET /all - Obtiene todos los servidores disponibles
 * No requiere parámetros en el body
 */
servermanager.get('/all', async (c) => {
  try {
    await ensureInitialized();
        
    console.log('Obteniendo lista de servidores...');
    await manager.scanAndMapServers();
    const updatedServers = await manager.getAllServers();
    
    return c.json(createResponse(true, { servers: updatedServers, scanned: true }, `${updatedServers.length} servidores encontrados`, null, 'list'));
  } catch (error) {
    console.error('Error obteniendo servidores:', error);
    return c.json(createResponse(false, null, null, 'Error interno del servidor', 'list'), 500);
  }
});

/**
 * GET /:server/:action - Obtiene información del servidor (solo lectura)
 * Acciones permitidas: info, status, metrics
 * No requiere parámetros en el body
 * Ejemplo: GET /myserver/info
 */

// Función unificada para manejar múltiples acciones del servidor
async function handleServerActions(serverName: string, actions: any[], actionType: 'server_actions' | 'commands' | 'logs'): Promise<{ success: boolean; actionResults: any[]; totalActions: number; successfulActions: number; failedActions: number }> {

  const actionResults: any[] = [];
  let successCount = 0;
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    let result = false;
    let message = '';
    let data: any = {};
    let error: string | null = null;
    
    try {
      switch (actionType) {
        case 'logs':
          const logLines = action.lines ? parseInt(action.lines) : undefined;
          const logs = manager.getServerLogs(serverName, logLines);
          result = true;
          message = `${logs.length} líneas de log obtenidas`;
          data = {
            logs: logs,
            format: action.format || 'array',
            totalLines: logs.length,
            requestedLines: logLines || 'all'
          };
          break;
        case 'commands':
          // Manejar comando único
          if (action.command !== undefined) {
            if (typeof action.command !== 'string') {
              result = false;
              error = 'El comando debe ser una cadena de texto';
            } else {
              result = manager.sendCommand(serverName, action.command);
              message = result ? `Comando '${action.command}' enviado correctamente` : 'No se pudo enviar el comando';
              data = { command: action.command, sent: result };
            }
          }
          // Manejar múltiples comandos
          else if (action.commands !== undefined) {
            if (!Array.isArray(action.commands)) {
              result = false;
              error = 'Los comandos deben ser un array de strings';
            } else {
              const commandResults: any[] = [];
              let successfulCommands = 0;
              
              for (const command of action.commands) {
                if (typeof command !== 'string') {
                  commandResults.push({ command, sent: false, error: 'El comando debe ser una cadena de texto' });
                  continue;
                }
                
                const commandSent = manager.sendCommand(serverName, command);
                commandResults.push({ command, sent: commandSent });
                
                if (commandSent) successfulCommands++;
                
                // Pequeña pausa entre comandos para evitar saturar el servidor
                if (action.commands.indexOf(command) < action.commands.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
              
              result = successfulCommands > 0;
              message = `${successfulCommands}/${action.commands.length} comandos enviados correctamente`;
              data = {
                commands: commandResults,
                totalCommands: action.commands.length,
                successfulCommands,
                failedCommands: action.commands.length - successfulCommands
              };
            }
          } else {
            result = false;
            error = 'Se requiere especificar "command" o "commands"';
          }
          break;
          
        case 'server_actions':
          const serverAction = action.type as ServerControlAction;
          if (!isServerControlAction(serverAction) && !isModifyingAction(serverAction)) {
            result = false;
            error = 'Acción de servidor no válida';
            break;
          }
          
          switch (serverAction) {
            case 'start':
              result = manager.startServer(serverName);
              message = result ? 'Servidor iniciado correctamente' : 'No se pudo iniciar el servidor';
              data = { previousStatus: 'stopped', newStatus: result ? 'running' : 'stopped' };
              break;
            case 'stop':
              result = manager.stopServer(serverName);
              message = result ? 'Servidor detenido correctamente' : 'No se pudo detener el servidor';
              data = { previousStatus: 'running', newStatus: result ? 'stopped' : 'running' };
              break;
            case 'restart':
              result = manager.restartServer(serverName);
              message = result ? 'Servidor reiniciado correctamente' : 'No se pudo reiniciar el servidor';
              data = { action: 'restart', newStatus: result ? 'running' : 'unknown' };
              break;
            case 'kill':
              result = manager.killServer(serverName);
              message = result ? 'Servidor terminado forzosamente' : 'No se pudo terminar el servidor';
              data = { action: 'force_kill', newStatus: result ? 'stopped' : 'unknown' };
              break;
          }
          break;
      }
    } catch (err) {
      result = false;
      error = err instanceof Error ? err.message : 'Error desconocido';
    }
    
    actionResults.push({
      index: i,
      action: action,
      success: result,
      message: message,
      data: data,
      error: error,
       timestamp: new Date().toISOString()
     });
     
     if (result) successCount++;
    
    // Pequeña pausa entre acciones para evitar saturar el servidor
    if (i < actions.length - 1 && actionType === 'commands') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return {
    success: successCount > 0,
    actionResults,
    totalActions: actions.length,
    successfulActions: successCount,
    failedActions: actions.length - successCount
  };
}





/**
 * Función helper para manejar acciones de solo lectura
 * Proporciona un formato consistente de respuesta similar a handleServerActions
 */
async function handleReadOnlyActions(serverName: string, action: ReadOnlyAction): Promise<{ success: boolean; data: any; message: string; error: string | null }> {
  let data: any;
  let message: string = '';
  let error: string | null = null;
  let success = false;

  try {
    // Verificar si el servidor existe
    let server = await manager.getServerByName(serverName);

    if (!server) {
      if (action === 'info') {
        console.log(`Servidor '${serverName}' no encontrado, reescaneando...`);
        await manager.scanAndMapServers();
        server = await manager.getServerByName(serverName);
      }
      
      if (!server) {
        error = 'Servidor no encontrado';
        return { success: false, data: null, message: '', error };
      }
    }

    switch (action) {
      case 'info':
        const status = manager.getServerStatus(serverName);
        server.status = status || "stopped";
        data = server;
        message = 'Información del servidor obtenida correctamente';
        success = true;
        break;
        
      case 'status':
        const serverStatus = manager.getServerStatus(serverName);
        data = {
          status: serverStatus || 'stopped',
          serverName: serverName,
          lastCheck: new Date().toISOString()
        };
        message = `Estado del servidor: ${serverStatus || 'stopped'}`;
        success = true;
        break;
        
      case 'metrics':
        data = manager.getServerMetrics(serverName);
        message = 'Métricas del servidor obtenidas correctamente';
        success = true;
        break;
      case 'logs':
        data = manager.getServerLogs(serverName);
        message = 'Logs del servidor obtenidos correctamente';
        success = true;
        break;

      default:
        error = `Acción '${action}' no válida para operaciones de solo lectura`;
        success = false;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error desconocido';
    success = false;
  }

  return { success, data, message, error };
}

servermanager.get('/:server/:action', async (c) => {
  const serverName = c.req.param('server');
  const action = c.req.param('action') as AllowedAction;
  
  if (!isReadOnlyAction(action)) {
    return c.json(createResponse(false, null, null, `Acción '${action}' no permitida en GET. Use POST para acciones que modifican estado.`, action, serverName), 405);
  }

  try {
    await ensureInitialized();
    
    // Usar handleReadOnlyActions para mantener consistencia
    const result = await handleReadOnlyActions(serverName, action);
    
    if (!result.success) {
      const statusCode = result.error === 'Servidor no encontrado' ? 404 : 500;
      return c.json(createResponse(false, result.data, null, result.error, action, serverName), statusCode);
    }
    
    return c.json(createResponse(true, result.data, result.message, null, action, serverName));
  } catch (error) {
    logger.error(`Error obteniendo ${action} del servidor ${serverName}:`, error);
    return c.json(createResponse(false, null, null, 'Error interno del servidor', action, serverName), 500);
  }
});

// ===== RUTAS POST (Acciones que modifican estado) =====

/**
 * POST /:server/:action - Ejecuta acciones que modifican el estado del servidor
 * Acciones permitidas: start, stop, restart, kill
 * No requiere parámetros en el body para acciones simples
 * Ejemplo: POST /myserver/start
 */
servermanager.post('/:server/:action', async (c) => {
  const serverName = c.req.param('server');
  const action = c.req.param('action') as AllowedAction;

  if (!isModifyingAction(action)) {
    return c.json(createResponse(false, null, null, `Acción '${action}' no permitida en POST. Use GET para acciones de solo lectura.`, action, serverName), 405);
  }

  try {
    await ensureInitialized();
    
    const server = await manager.getServerByName(serverName);
    if (!server) {
      return c.json(createResponse(false, null, null, 'Servidor no encontrado', action, serverName), 404);
    }

    // Determinar el tipo de acción y crear el payload apropiado
    let actions: any[];
    let actionType: 'server_actions' | 'commands';
    
    if (isServerControlAction(action)) {
      actions = [{ type: action }];
      actionType = 'server_actions';
    } else if (isCommandAction(action)) {
      // Para 'send' y 'command', necesitamos el comando en el body
      const body = await c.req.json().catch(() => ({}));
      if (!body.command) {
        return c.json(createResponse(false, null, null, 'Se requiere un comando en el body para acciones de comando', action, serverName), 400);
      }
      actions = [{ command: body.command }];
      actionType = 'commands';
    } else {
      return c.json(createResponse(false, null, null, `Acción '${action}' no soportada en esta ruta`, action, serverName), 400);
    }
    
    const result = await handleServerActions(serverName, actions, actionType);
    
    if (result.actionResults.length > 0) {
      const actionResult = result.actionResults[0];
      
      if (!actionResult.success) {
        return c.json(createResponse(false, actionResult.data, null, actionResult.error, action, serverName), 500);
      }
      
      return c.json(createResponse(true, actionResult.data, actionResult.message, null, action, serverName));
    } else {
      return c.json(createResponse(false, null, null, 'No se pudo ejecutar la acción', action, serverName), 500);
    }
  } catch (error) {
    logger.error(`Error ejecutando ${action} del servidor ${serverName}:`, error);
    return c.json(createResponse(false, null, null, 'Error interno del servidor', action, serverName), 500);
  }
});

/**
 * POST /:server/actions - Ejecuta múltiples acciones en lote
 * Requiere un array de acciones en el body: { "actions": [...] }
 * Tipos de acciones: server_actions, commands, logs
 * Ejemplo: POST /myserver/actions con body { "actions": [{ "type": "start" }, { "type": "stop" }] }
 */
servermanager.post('/:server/actions', async (c) => {
  const serverName = c.req.param('server');
  
  try {
    await ensureInitialized();
    
    const server = await manager.getServerByName(serverName);
    if (!server) {
      return c.json(createResponse(false, null, null, 'Servidor no encontrado', 'actions', serverName), 404);
    }

    const body = await c.req.json();
    const actions = body?.actions;
    
    if (!actions || !Array.isArray(actions)) {
      return c.json(createResponse(false, null, null, 'Array de acciones requerido en el body', 'actions', serverName), 400);
    }
    
    if (actions.length === 0) {
      return c.json(createResponse(false, null, null, 'El array de acciones no puede estar vacío', 'actions', serverName), 400);
    }

    // Determinar el tipo de acción basado en el primer elemento
    const firstAction = actions[0];
    let actionType: 'server_actions' | 'commands' | 'logs' = 'server_actions';
    
    if (firstAction.command !== undefined || firstAction.commands !== undefined) {
      actionType = 'commands';
    } else if (firstAction.lines !== undefined || firstAction.format !== undefined) {
      actionType = 'logs';
    } else if (firstAction.type && isServerControlAction(firstAction.type)) {
      actionType = 'server_actions';
    }
    
    const result = await handleServerActions(serverName, actions, actionType);
    
    const responseData = {
      totalActions: result.totalActions,
      successfulActions: result.successfulActions,
      failedActions: result.failedActions,
      actionResults: result.actionResults
    };
    
    const message = `${result.successfulActions}/${result.totalActions} acciones ejecutadas correctamente`;
    
    return c.json(createResponse(result.success, responseData, message, result.success ? null : 'No se pudo ejecutar ninguna acción', 'actions', serverName));
    
  } catch (error) {
    logger.error(`Error ejecutando acciones en servidor ${serverName}:`, error);
    return c.json(createResponse(false, null, null, 'Error interno del servidor', 'actions', serverName), 500);
  }
});

/**
 * DELETE /:server/logs - Limpia los logs de un servidor específico
 * No requiere parámetros en el body
 * Ejemplo: DELETE /myserver/logs
 */
servermanager.delete('/:server/logs', async (c) => {
  const serverName = c.req.param('server');
  
  try {
    await ensureInitialized();
    
    const server = await manager.getServerByName(serverName);
    if (!server) {
      return c.json(createResponse(false, null, null, 'Servidor no encontrado', 'clear_logs', serverName), 404);
    }

    const result = manager.clearServerLogs(serverName);
    const message = result ? 'Logs limpiados correctamente' : 'No se pudieron limpiar los logs';
    
    return c.json(createResponse(result, { cleared: result }, message, result ? null : message, 'clear_logs', serverName));
  } catch (error) {
    logger.error(`Error limpiando logs del servidor ${serverName}:`, error);
    return c.json(createResponse(false, null, null, 'Error interno del servidor', 'clear_logs', serverName), 500);
  }
});

// ===== RUTAS ADICIONALES =====

/**
 * GET /stats - Obtiene estadísticas generales del sistema
 * No requiere parámetros
 */
servermanager.get('/stats', async (c) => {
  try {
    await ensureInitialized();
    
    const stats = await manager.getServerStats();
    
    return c.json(createResponse(true, stats, 'Estadísticas obtenidas correctamente', null, 'stats'));
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    return c.json(createResponse(false, null, null, 'Error interno del servidor', 'stats'), 500);
  }
});

/**
 * POST /rescan - Fuerza un rescaneo completo de servidores
 * No requiere parámetros en el body
 */
servermanager.post('/rescan', async (c) => {
  try {
    await ensureInitialized();
    
    console.log('Iniciando rescaneo forzado de servidores...');
    const servers = await manager.scanAndMapServers();
    await manager.initializeServersInManager();
    
    const responseData = {
      serversFound: servers.length,
      validServers: servers.filter(s => s.isValid).length,
      invalidServers: servers.filter(s => !s.isValid).length,
      timestamp: new Date().toISOString()
    };
    
    return c.json(createResponse(true, responseData, `Rescaneo completado: ${servers.length} servidores encontrados`, null, 'rescan'));
  } catch (error) {
    logger.error('Error durante el rescaneo:', error);
    return c.json(createResponse(false, null, null, 'Error interno del servidor', 'rescan'), 500);
  }
});

/**
 * GET /system/info - Obtiene información del estado del sistema
 * No requiere parámetros
 */
servermanager.get('/system/info', async (c) => {
  try {
    const systemInfo = {
      initialized: isInitialized,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: {
        standardizedResponses: true,
        separatedGetPost: true,
        multipleCommands: true,
        enhancedLogging: true
      }
    };
    
    return c.json(createResponse(true, systemInfo, 'Información del sistema obtenida', null, 'system_info'));
  } catch (error) {
    logger.error('Error obteniendo información del sistema:', error);
    return c.json(createResponse(false, null, null, 'Error interno del servidor', 'system_info'), 500);
  }
});

/*
=== RESUMEN DE RUTAS API ===

GET (Solo lectura - no requieren body):
- GET /all                    - Lista todos los servidores
- GET /:server/info          - Información completa del servidor
- GET /:server/status        - Estado actual del servidor
- GET /:server/metrics       - Métricas del servidor
- GET /stats                 - Estadísticas generales del sistema
- GET /system/info           - Información del estado del sistema

POST (Modifican estado - pueden requerir body):
- POST /:server/start        - Inicia el servidor
- POST /:server/stop         - Detiene el servidor
- POST /:server/restart      - Reinicia el servidor
- POST /:server/kill         - Termina forzosamente el servidor
- POST /:server/actions      - Ejecuta múltiples acciones (requiere body)
- POST /rescan               - Fuerza rescaneo de servidores

DELETE (Eliminan datos):
- DELETE /:server/logs       - Limpia los logs del servidor

NOTAS IMPORTANTES:
- Las rutas GET no aceptan parámetros en el body
- Las rutas POST para acciones simples no requieren body
- POST /:server/actions requiere body con formato: { "actions": [...] }
- Códigos de error HTTP apropiados: 400 (Bad Request), 404 (Not Found), 405 (Method Not Allowed), 500 (Internal Server Error)
*/

// Exportar solo el router, las constantes y tipos se exportan desde ./types.js
export { servermanager };

// Re-exportar tipos y constantes para compatibilidad
export {
  READ_ONLY_ACTIONS,
  MODIFYING_ACTIONS,
  SERVER_CONTROL_ACTIONS,
  COMMAND_ACTIONS,
  LOG_ACTIONS,
  isReadOnlyAction,
  isModifyingAction,
  isServerControlAction
} from './types.js';

export type {
  ReadOnlyAction,
  ModifyingAction,
  ServerControlAction,
  CommandActionType,
  LogAction,
  AllowedAction,
  ApiResponse
} from './types.js';
