import { Hono } from 'hono';
import { getCoresList, getCoreVersions, getCoreVersionURL, type ServerCore, type SpigotVersion } from '../../core/mc/coredownloader.js';
import { defaultLogger as logger } from '../../logger/index.js';

const coresRouter = new Hono();

// GET /cores - Obtener lista de todos los cores disponibles
coresRouter.get('/', async (c) => {
    try {
        const cores = getCoresList();
        return c.json({
            success: true,
            data: cores,
            message: 'Lista de cores obtenida exitosamente'
        });
    } catch (error) {
        logger.error('Error obteniendo lista de cores:', error);
        return c.json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo obtener la lista de cores'
        }, 500);
    }
});

// GET /cores/:coreName - Obtener información específica de un core
coresRouter.get('/:coreName', async (c) => {
    try {
        const coreName = c.req.param('coreName');
        const cores = getCoresList();
        
        if (!cores[coreName]) {
            return c.json({
                success: false,
                error: 'Core no encontrado',
                message: `El core '${coreName}' no existe`
            }, 404);
        }
        
        return c.json({
            success: true,
            data: cores[coreName],
            message: `Información del core '${coreName}' obtenida exitosamente`
        });
    } catch (error) {
        logger.error('Error obteniendo información del core:', error);
        return c.json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo obtener la información del core'
        }, 500);
    }
});

// GET /cores/:coreName/versions - Obtener versiones disponibles de un core
coresRouter.get('/:coreName/versions', async (c) => {
    try {
        const coreName = c.req.param('coreName');
        const cores = getCoresList();
        
        if (!cores[coreName]) {
            return c.json({
                success: false,
                error: 'Core no encontrado',
                message: `El core '${coreName}' no existe`
            }, 404);
        }
        
        const versions = await getCoreVersions(coreName);
        
        if (versions === false) {
            return c.json({
                success: false,
                error: 'Error obteniendo versiones',
                message: `No se pudieron obtener las versiones para el core '${coreName}'`
            }, 500);
        }
        
        return c.json({
            success: true,
            data: {
                core: coreName,
                versions: versions,
                count: Array.isArray(versions) ? versions.length : 0
            },
            message: `Versiones del core '${coreName}' obtenidas exitosamente`
        });
    } catch (error) {
        logger.error('Error obteniendo versiones del core:', error);
        return c.json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las versiones del core'
        }, 500);
    }
});

// GET /cores/:coreName/versions/:version/download - Obtener URL de descarga de una versión específica
coresRouter.get('/:coreName/versions/:version/download', async (c) => {
    try {
        const coreName = c.req.param('coreName');
        const version = c.req.param('version');
        const cores = getCoresList();
        
        if (!cores[coreName]) {
            return c.json({
                success: false,
                error: 'Core no encontrado',
                message: `El core '${coreName}' no existe`
            }, 404);
        }
        
        const downloadUrl = await getCoreVersionURL(coreName, version);
        
        if (downloadUrl === false) {
            return c.json({
                success: false,
                error: 'URL de descarga no encontrada',
                message: `No se pudo obtener la URL de descarga para ${coreName} versión ${version}`
            }, 404);
        }
        
        return c.json({
            success: true,
            data: {
                core: coreName,
                version: version,
                downloadUrl: downloadUrl
            },
            message: `URL de descarga obtenida exitosamente`
        });
    } catch (error) {
        logger.error('Error obteniendo URL de descarga:', error);
        return c.json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo obtener la URL de descarga'
        }, 500);
    }
});

// POST /cores/:coreName/versions/:version/download - Iniciar descarga directa (opcional)
coresRouter.post('/:coreName/versions/:version/download', async (c) => {
    try {
        const coreName = c.req.param('coreName');
        const version = c.req.param('version');
        const cores = getCoresList();
        
        if (!cores[coreName]) {
            return c.json({
                success: false,
                error: 'Core no encontrado',
                message: `El core '${coreName}' no existe`
            }, 404);
        }
        
        const downloadUrl = await getCoreVersionURL(coreName, version);
        
        if (downloadUrl === false) {
            return c.json({
                success: false,
                error: 'URL de descarga no encontrada',
                message: `No se pudo obtener la URL de descarga para ${coreName} versión ${version}`
            }, 404);
        }
        
        // Aquí podrías implementar lógica adicional para iniciar la descarga
        // Por ejemplo, guardar en una cola de descargas, notificar al usuario, etc.
        
        return c.json({
            success: true,
            data: {
                core: coreName,
                version: version,
                downloadUrl: downloadUrl,
                status: 'download_initiated'
            },
            message: `Descarga iniciada para ${coreName} versión ${version}`
        });
    } catch (error) {
        logger.error('Error iniciando descarga:', error);
        return c.json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo iniciar la descarga'
        }, 500);
    }
});

export default coresRouter;
