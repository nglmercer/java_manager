/**
 * Ejemplo de uso del sistema de gestión de servidores de Minecraft
 * 
 * Este archivo demuestra cómo usar todas las funcionalidades desarrolladas:
 * - Mapeo de carpetas de servidores
 * - Enriquecimiento de datos
 * - Filtrado y validación
 */

import { minecraftServerManager } from '../src/core/server/serverFiles.js';
import type{
  MinecraftServerInfo,
  ServerFilterOptions
} from '../src/core/types/mcserver.js';

/**
 * Función principal de demostración
 */
async function demonstrateServerManagement() {
  try {
    console.log('=== Iniciando Sistema de Gestión de Servidores de Minecraft ===\n');
    
    // 1. Inicializar el sistema
    console.log('1. Inicializando el sistema...');
    await minecraftServerManager.initialize();
    console.log('✅ Sistema inicializado correctamente\n');
    
    // 2. Escanear y mapear servidores
    console.log('2. Escaneando carpetas de servidores...');
    const servers = await minecraftServerManager.scanAndMapServers();
    console.log(`✅ Escaneo completado. Encontrados ${servers.length} servidores\n`);
    
    // 3. Mostrar estadísticas generales
    console.log('3. Estadísticas de servidores:');
    const stats = await minecraftServerManager.getServerStats();
    console.log(`   Total: ${stats.total}`);
    console.log(`   Válidos: ${stats.valid}`);
    console.log(`   Inválidos: ${stats.invalid}`);
    console.log(`   Tamaño total de mundos: ${formatBytes(stats.totalWorldSize)}`);
    console.log(`   Tamaño promedio: ${formatBytes(stats.averageWorldSize)}`);
    console.log('   Por tipo:', stats.byType);
    console.log('');
    
    // 4. Demostrar filtrado de servidores
    console.log('4. Ejemplos de filtrado:');
    
    // Filtrar solo servidores válidos
    const validServers = await minecraftServerManager.filterServers({
      validOnly: true
    });
    console.log(`   Servidores válidos: ${validServers.length}`);
    
    // Filtrar por tipo de servidor
    const vanillaServers = await minecraftServerManager.filterServers({
      serverType: ['vanilla', 'paper']
    });
    console.log(`   Servidores vanilla/paper: ${vanillaServers.length}`);
    
    // Filtrar por archivos requeridos
    const serversWithPlugins = await minecraftServerManager.filterServers({
      hasRequiredFiles: ['plugins']
    });
    console.log(`   Servidores con carpeta plugins: ${serversWithPlugins.length}`);
    
    // Filtro personalizado
    const largeWorldServers = await minecraftServerManager.filterServers({
      customFilter: (server) => (server.worldSize || 0) > 100 * 1024 * 1024 // > 100MB
    });
    console.log(`   Servidores con mundos grandes (>100MB): ${largeWorldServers.length}\n`);
    
    // 5. Demostrar enriquecimiento de datos
    if (servers.length > 0) {
      console.log('5. Demostrando enriquecimiento de datos:');
      const firstServer = servers[0];
      
      console.log(`   Servidor: ${firstServer.name}`);
      console.log(`   Tipo detectado: ${firstServer.serverType}`);
      console.log(`   Versión: ${firstServer.version || 'No detectada'}`);
      console.log(`   Plugins: ${firstServer.plugins?.length || 0}`);
      console.log(`   Mods: ${firstServer.mods?.length || 0}`);
      
      // Añadir datos personalizados
      const customData: Partial<MinecraftServerInfo> = {
        description: 'Servidor de ejemplo actualizado',
        tags: ['ejemplo', 'test'],
        customData: {
          owner: 'Administrador',
          lastMaintenance: new Date(),
          priority: 'high'
        }
      };
      
      const updated = await minecraftServerManager.updateServerData(
        firstServer.id,
        customData
      );
      
      if (updated) {
        console.log('   ✅ Datos del servidor actualizados');
        
        // Añadir tags adicionales
        await minecraftServerManager.addServerTags(firstServer.id, ['production', 'monitored']);
        console.log('   ✅ Tags añadidos');
      }
      console.log('');
    }
    
    // 6. Mostrar detalles de validación
    console.log('6. Detalles de validación:');
    servers.slice(0, 3).forEach((server, index) => {
      console.log(`   Servidor ${index + 1}: ${server.name}`);
      console.log(`     Válido: ${server.validationResult.isValid ? '✅' : '❌'}`);
      
      if (server.validationResult.errors.length > 0) {
        console.log(`     Errores: ${server.validationResult.errors.join(', ')}`);
      }
      
      if (server.validationResult.warnings.length > 0) {
        console.log(`     Advertencias: ${server.validationResult.warnings.join(', ')}`);
      }
      
      console.log(`     Archivos encontrados: ${server.files.length}`);
      console.log('');
    });
    
    // 7. Demostrar filtrado avanzado
    console.log('7. Filtrado avanzado con múltiples criterios:');
    const advancedFilter: ServerFilterOptions = {
      validOnly: true,
      serverType: ['vanilla', 'paper', 'spigot'],
      minWorldSize: 10 * 1024 * 1024, // Mínimo 10MB
      tags: ['production'],
      customFilter: (server) => {
        // Solo servidores que tengan server.properties y no tengan errores críticos
        const hasServerProps = server.files.some(f => f.name.toLowerCase() === 'server.properties');
        const noCriticalErrors = !server.validationResult.errors.some(e => e.includes('requeridos'));
        return hasServerProps && noCriticalErrors;
      }
    };
    
    const filteredServers = await minecraftServerManager.filterServers(advancedFilter);
    console.log(`   Servidores que cumplen criterios avanzados: ${filteredServers.length}`);
    
    filteredServers.forEach(server => {
      console.log(`     - ${server.name} (${server.serverType}, ${formatBytes(server.worldSize || 0)})`);
    });
    
    console.log('\n=== Demostración completada ===');
    
  } catch (error) {
    console.error('Error durante la demostración:', error);
  }
}

/**
 * Función para formatear bytes en formato legible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Ejemplo de configuración personalizada
 */
export async function customConfigurationExample() {
  console.log('=== Ejemplo de Configuración Personalizada ===\n');
  
  // Exportar configuración actual
  const currentConfig = await minecraftServerManager.exportConfig();
  console.log('Configuración actual:', JSON.stringify(currentConfig, null, 2));
  
  // Crear configuración personalizada
  const customConfig = {
    ...currentConfig,
    autoScanInterval: 1800000, // 30 minutos
    excludePatterns: ['temp', 'backup*', '.*', 'logs', 'cache'],
    validationCriteria: {
      requiredFiles: ['server.jar', 'server.properties', 'eula.txt'],
      allowedExtensions: ['.jar', '.properties', '.yml', '.yaml', '.json', '.txt'],
      minSize: 2048, // 2KB mínimo
      maxSize: 2 * 1024 * 1024 * 1024, // 2GB máximo
      contentPatterns: ['eula=true'], // EULA debe estar aceptado
      forbiddenPatterns: ['password=', 'secret=', 'token=']
    }
  };
  
  // Importar nueva configuración
  await minecraftServerManager.importConfig(customConfig);
  console.log('✅ Configuración personalizada aplicada');
}

/**
 * Ejemplo de uso de tags para organización
 */
export async function tagsManagementExample() {
  console.log('=== Ejemplo de Gestión de Tags ===\n');
  
  const servers = await minecraftServerManager.getAllServers();
  
  if (servers.length > 0) {
    const server = servers[0];
    
    // Añadir tags de categorización
    await minecraftServerManager.addServerTags(server.id, [
      'production',
      'monitored',
      'backup-enabled',
      'high-priority'
    ]);
    
    console.log(`Tags añadidos al servidor ${server.name}`);
    
    // Filtrar por tags
    const productionServers = await minecraftServerManager.filterServers({
      tags: ['production']
    });
    
    console.log(`Servidores de producción: ${productionServers.length}`);
    
    // Remover algunos tags
    await minecraftServerManager.removeServerTags(server.id, ['high-priority']);
    console.log('Tag "high-priority" removido');
  }
}

// Ejecutar la demostración si este archivo se ejecuta directamente
  demonstrateServerManagement()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error en la demostración:', error);
      process.exit(1);
    });


export { demonstrateServerManagement };