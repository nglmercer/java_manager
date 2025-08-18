/**
 * Ejemplo de prueba para verificar la detección de servidores
 */

import { MinecraftServerManager } from '../src/core/server/serverFiles.js';
import { defaultPaths } from '../src/config.js';
import type { ServerMapperConfig } from '../src/core/server/types.js';

async function testServerDetection() {
  console.log('=== Prueba de Detección de Servidores ===\n');
  
  // Crear una instancia con configuración personalizada
  const manager = new MinecraftServerManager();
  
  // Configuración personalizada sin patrones de exclusión problemáticos
  const customConfig: Partial<ServerMapperConfig> = {
    excludePatterns: ['logs', 'cache', 'crash-reports'], // Removemos 'temp' y 'backup*'
    scanSubdirectories: true,
    autoEnrichment: true
  };
  
  try {
    console.log('1. Inicializando sistema...');
    await manager.initialize();
    
    console.log('2. Aplicando configuración personalizada...');
    await manager.importConfig({
      ...customConfig,
      autoScanInterval: 3600000
    });
    
    console.log('3. Verificando ruta de servidores:', defaultPaths.serversPath);
    
    console.log('4. Escaneando servidores...');
    const servers = await manager.scanAndMapServers();
    
    console.log(`✅ Escaneo completado. Encontrados ${servers.length} servidores\n`);
    
    if (servers.length > 0) {
      console.log('5. Detalles de servidores encontrados:');
      servers.forEach((server, index) => {
        console.log(`\n   Servidor ${index + 1}:`);
        console.log(`     ID: ${server.id}`);
        console.log(`     Nombre: ${server.name}`);
        console.log(`     Ruta: ${server.path}`);
        console.log(`     Válido: ${server.isValid ? '✅' : '❌'}`);
        console.log(`     Tipo: ${server.serverType || 'No detectado'}`);
        console.log(`     Versión: ${server.version || 'No detectada'}`);
        console.log(`     Archivos: ${server.files.length}`);
        console.log(`     Plugins: ${server.plugins?.length || 0}`);
        console.log(`     Mods: ${server.mods?.length || 0}`);
        
        if (server.validationResult.errors.length > 0) {
          console.log(`     Errores: ${server.validationResult.errors.join(', ')}`);
        }
        
        if (server.validationResult.warnings.length > 0) {
          console.log(`     Advertencias: ${server.validationResult.warnings.join(', ')}`);
        }
      });
      
      console.log('\n6. Estadísticas:');
      const stats = await manager.getServerStats();
      console.log(`   Total: ${stats.total}`);
      console.log(`   Válidos: ${stats.valid}`);
      console.log(`   Inválidos: ${stats.invalid}`);
      console.log(`   Por tipo:`, stats.byType);
      
    } else {
      console.log('❌ No se encontraron servidores');
      console.log('\nVerificando configuración:');
      const config = await manager.exportConfig();
      console.log('Configuración actual:', JSON.stringify(config, null, 2));
    }
    
  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

// Ejecutar la prueba
testServerDetection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error en la prueba:', error);
    process.exit(1);
  });