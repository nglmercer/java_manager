/**
 * Ejemplos de uso de la librería de utilidades de scripts
 * Demuestra cómo usar las diferentes funcionalidades de forma práctica
 */

import path from 'node:path';
import { ScriptUtils, PlatformScriptUtils } from '../src/utils/script-utils.js';
import { AdvancedScriptUtils, scriptEventManager, ScriptTemplates } from '../src/utils/advanced-script-utils.js';
import type{
  ShellScriptConfig,
  BatchScriptConfig,
  PropertiesConfig,
  AdvancedShellScriptConfig,
  AdvancedBatchScriptConfig,
  ScriptGenerationOptions
} from '../src/utils/script-types.js';
import { FileUtils } from '../src/utils/file.utils.js';

// ===== EJEMPLOS BÁSICOS =====

/**
 * Ejemplo 1: Crear un script básico de inicio de servidor Java
 */
const folderTemp = path.join(process.cwd(),'temp')
export async function createBasicJavaServerScript() {
  console.log('=== Ejemplo 1: Script básico de servidor Java ===');
  
  try {
    // Configuración del script
    const config = {
      name: 'minecraft-server',
      javaPath: 'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe',
      jarFile: 'server.jar',
      jvmArgs: ['-Xms2G', '-Xmx4G', '-XX:+UseG1GC'],
      workingDirectory: path.join(folderTemp, 'servers', 'minecraft'),
      description: 'Script de inicio para servidor Minecraft'
    };
    
    // Crear script apropiado para la plataforma
    const result = await PlatformScriptUtils.createStartupScript(config);
    
    if (result.success) {
      console.log(`✅ Script creado: ${result.data.scriptPath}`);
      console.log(`📄 Tipo: ${result.data.scriptType}`);
    } else {
      console.error(`❌ Error: ${result.error}`);
    }
  } catch (error: any) {
    console.error('Error en ejemplo 1:', error.message);
  }
}

/**
 * Ejemplo 2: Crear archivo de propiedades de servidor
 */
export async function createServerPropertiesFile() {
  console.log('\n=== Ejemplo 2: Archivo de propiedades ===');
  
  try {
    const config: PropertiesConfig = {
      name: 'server-config',
      description: 'Configuración del servidor Minecraft',
      properties: {
        'server-port': 25565,
        'max-players': 20,
        'motd': 'Mi Servidor Minecraft',
        'difficulty': 'normal',
        'gamemode': 'survival',
        'pvp': true,
        'spawn-protection': 16,
        'view-distance': 10
      },
      comments: {
        'server-port': 'Puerto del servidor',
        'max-players': 'Número máximo de jugadores',
        'motd': 'Mensaje del día',
        'difficulty': 'Dificultad del juego'
      },
      sections: {
        'Configuración de red': {
          'enable-query': true,
          'query.port': 25565,
          'enable-rcon': false
        },
        'Configuración de mundo': {
          'level-name': 'world',
          'level-seed': '',
          'generate-structures': true,
          'spawn-monsters': true
        }
      }
    };
    
    const result = await ScriptUtils.generatePropertiesFile(config);
    
    if (result.success) {
      // Guardar el archivo
      const filePath = path.join(folderTemp, 'server.properties');
      const writeResult = await FileUtils.writeFile(
        folderTemp,
        '',
        'server.properties',
        result.data
      );
      
      if (writeResult.success) {
        console.log(`✅ Archivo de propiedades creado: ${writeResult.data}`);
      }
    } else {
      console.error(`❌ Error: ${result.error}`);
    }
  } catch (error: any) {
    console.error('Error en ejemplo 2:', error.message);
  }
}

// ===== EJEMPLOS AVANZADOS =====

/**
 * Ejemplo 3: Script avanzado de shell con manejo de errores y logging
 */
export async function createAdvancedShellScript() {
  console.log('\n=== Ejemplo 3: Script avanzado de shell ===');
  
  try {
    const config: AdvancedShellScriptConfig = {
      name: 'advanced-server-manager',
      description: 'Gestor avanzado de servidor con logging y verificaciones',
      version: '1.0.0',
      author: 'Sistema de Gestión Java',
      shebang: '#!/bin/bash',
      strictMode: true,
      
      variables: [
        {
          name: 'SERVER_DIR',
          value: '/opt/minecraft-server',
          type: 'path',
          description: 'Directorio del servidor',
          required: true
        },
        {
          name: 'JAVA_HOME',
          value: '/usr/lib/jvm/java-17-openjdk',
          type: 'path',
          description: 'Directorio de instalación de Java',
          required: true
        },
        {
          name: 'MAX_MEMORY',
          value: '4G',
          type: 'string',
          description: 'Memoria máxima para la JVM',
          required: false,
          defaultValue: '2G'
        }
      ],
      
      dependencies: [
        {
          name: 'java',
          required: true,
          description: 'Java Runtime Environment',
          checkCommand: 'java -version'
        },
        {
          name: 'screen',
          required: false,
          description: 'Screen para ejecutar en background',
          installCommand: 'sudo apt-get install screen'
        }
      ],
      
      commands: [
        {
          command: 'echo "Iniciando servidor..."',
          description: 'Mensaje de inicio'
        },
        {
          command: 'cd "$SERVER_DIR"',
          description: 'Cambiar al directorio del servidor'
        },
        {
          command: '"$JAVA_HOME/bin/java" -Xms1G -Xmx"$MAX_MEMORY" -jar server.jar nogui',
          description: 'Ejecutar el servidor',
          timeout: 300000, // 5 minutos
          continueOnError: false
        }
      ],
      
      logging: {
        enabled: true,
        level: 'info',
        outputFile: '/var/log/minecraft-server.log',
        includeTimestamp: true,
        includeLevel: true
      },
      
      security: {
        allowedCommands: ['java', 'echo', 'cd', 'ls', 'ps'],
        maxExecutionTime: 600000, // 10 minutos
        allowNetworkAccess: true,
        allowFileSystemAccess: true
      },
      
      trapSignals: ['SIGINT', 'SIGTERM'],
      cleanupCommands: [
        'echo "Deteniendo servidor..."',
        'pkill -f "java.*server.jar"'
      ]
    };
    
    const options: ScriptGenerationOptions = {
      includeHeader: true,
      includeComments: true,
      includeErrorHandling: true,
      indentation: 'spaces',
      indentSize: 2,
      lineEnding: 'lf'
    };
    
    const result = await AdvancedScriptUtils.generateAdvancedShellScript(config, options);
    
    if (result.success) {
      // Guardar el script
      const scriptPath = path.join(folderTemp, 'advanced-server.sh');
      const writeResult = await FileUtils.writeFile(
        folderTemp,
        '',
        'advanced-server.sh',
        result.data
      );
      
      if (writeResult.success) {
        console.log(`✅ Script avanzado creado: ${writeResult.data}`);
        
        // Analizar el script creado
        const analysis = await AdvancedScriptUtils.performDetailedAnalysis(scriptPath);
        if (analysis.success) {
          console.log(`📊 Análisis del script:`);
          console.log(`   - Líneas de código: ${analysis.data.complexity.linesOfCode}`);
          console.log(`   - Complejidad ciclomática: ${analysis.data.complexity.cyclomaticComplexity}`);
          console.log(`   - Ratio de comentarios: ${analysis.data.complexity.commentRatio.toFixed(1)}%`);
          console.log(`   - Variables: ${analysis.data.variables.length}`);
          console.log(`   - Comandos: ${analysis.data.commands.length}`);
        }
      }
    } else {
      console.error(`❌ Error: ${result.error}`);
    }
  } catch (error: any) {
    console.error('Error en ejemplo 3:', error.message);
  }
}

/**
 * Ejemplo 4: Análisis y validación de scripts existentes
 */
export async function analyzeExistingScript() {
  console.log('\n=== Ejemplo 4: Análisis de script existente ===');
  
  try {
    const scriptPath = path.join(process.cwd(), 'advanced-server.sh');
    
    // Verificar si el archivo existe
    const exists = await FileUtils.pathExists(scriptPath);
    if (!exists.success || !exists.data) {
      console.log('⚠️  Primero ejecuta el ejemplo 3 para crear el script');
      return;
    }
    
    // Análisis básico
    console.log('🔍 Realizando análisis básico...');
    const basicAnalysis = await ScriptUtils.analyzeScript(scriptPath);
    
    if (basicAnalysis.success) {
      const data = basicAnalysis.data;
      console.log(`📄 Tipo: ${data.type}`);
      console.log(`📏 Líneas: ${data.lineCount}`);
      console.log(`🔧 Variables encontradas: ${Object.keys(data.variables).length}`);
      console.log(`⚡ Comandos encontrados: ${data.commands.length}`);
      
      if (data.hasShebang) {
        console.log(`🏷️  Shebang: ${data.shebang}`);
      }
    }
    
    // Análisis detallado
    console.log('\n🔬 Realizando análisis detallado...');
    const detailedAnalysis = await AdvancedScriptUtils.performDetailedAnalysis(scriptPath);
    
    if (detailedAnalysis.success) {
      const data = detailedAnalysis.data;
      console.log(`📊 Complejidad ciclomática: ${data.complexity.cyclomaticComplexity}`);
      console.log(`💬 Ratio de comentarios: ${data.complexity.commentRatio.toFixed(1)}%`);
      console.log(`🔒 Riesgos de seguridad: ${data.securityAnalysis.potentialRisks.length}`);
      
      if (data.securityAnalysis.potentialRisks.length > 0) {
        console.log('⚠️  Riesgos detectados:');
        data.securityAnalysis.potentialRisks.forEach(risk => {
          console.log(`   - ${risk}`);
        });
      }
    }
    
    // Validación avanzada
    console.log('\n✅ Realizando validación avanzada...');
    const validation = await AdvancedScriptUtils.performAdvancedValidation(scriptPath);
    
    if (validation.success) {
      const data = validation.data;
      console.log(`🎯 Puntuación general: ${data.score}/100`);
      console.log(`✔️  Sintaxis válida: ${data.syntax.valid ? 'Sí' : 'No'}`);
      console.log(`🔒 Puntuación de seguridad: ${data.security.score}/100`);
      console.log(`⚡ Puntuación de rendimiento: ${data.performance.score}/100`);
      console.log(`🛠️  Puntuación de mantenibilidad: ${data.maintainability.score}/100`);
      
      if (data.security.recommendations.length > 0) {
        console.log('💡 Recomendaciones de seguridad:');
        data.security.recommendations.forEach(rec => {
          console.log(`   - ${rec}`);
        });
      }
      
      if (data.maintainability.suggestions.length > 0) {
        console.log('💡 Sugerencias de mantenibilidad:');
        data.maintainability.suggestions.forEach(sug => {
          console.log(`   - ${sug}`);
        });
      }
    }
    
  } catch (error: any) {
    console.error('Error en ejemplo 4:', error.message);
  }
}

/**
 * Ejemplo 5: Uso de templates predefinidos
 */
export async function useScriptTemplates() {
  console.log('\n=== Ejemplo 5: Uso de templates ===');
  
  try {
    // Listar templates disponibles
    console.log('📋 Templates disponibles:');
    Object.entries(ScriptTemplates).forEach(([key, template]) => {
      console.log(`   - ${key}: ${template.description}`);
      console.log(`     Categoría: ${template.category}`);
      console.log(`     Tags: ${template.tags.join(', ')}`);
    });
    
    // Usar template de servidor Java
    console.log('\n🔧 Creando script desde template...');
    const template = ScriptTemplates.javaServer;
    
    // Reemplazar variables en el template
    let scriptContent = template.content;
    const variables = {
      'JAVA_PATH': '/usr/bin/java',
      'JAR_FILE': 'minecraft-server.jar',
      'JVM_ARGS': '-Xms2G -Xmx4G -XX:+UseG1GC'
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      scriptContent = scriptContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    
    // Guardar script generado desde template
    const templateScriptPath = path.join(folderTemp, 'template-server.sh');
    const writeResult = await FileUtils.writeFile(
      folderTemp,
      '',
      'template-server.sh',
      scriptContent
    );
    
    if (writeResult.success) {
      console.log(`✅ Script desde template creado: ${writeResult.data}`);
      console.log(`📖 Uso: ${template.usage}`);
      console.log(`💡 Ejemplos:`);
      template.examples?.forEach(example => {
        console.log(`   - ${example}`);
      });
    }
    
  } catch (error: any) {
    console.error('Error en ejemplo 5:', error.message);
  }
}

/**
 * Ejemplo 6: Manejo de eventos de scripts
 */
export async function demonstrateEventHandling() {
  console.log('\n=== Ejemplo 6: Manejo de eventos ===');
  
  try {
    // Configurar listeners de eventos
    scriptEventManager.addEventListener('created', (event) => {
      console.log(`🎉 Script creado: ${event.scriptPath}`);
    });
    
    scriptEventManager.addEventListener('validated', (event) => {
      console.log(`✅ Script validado: ${event.scriptPath}`);
      if (event.details?.score) {
        console.log(`   Puntuación: ${event.details.score}/100`);
      }
    });
    
    scriptEventManager.addEventListener('error', (event) => {
      console.error(`❌ Error en script: ${event.scriptPath}`);
      if (event.error) {
        console.error(`   ${event.error.message}`);
      }
    });
    
    // Simular eventos
    console.log('📡 Configurando listeners de eventos...');
    
    scriptEventManager.emitEvent({
      type: 'created',
      timestamp: new Date(),
      scriptPath: '/path/to/new-script.sh'
    });
    
    scriptEventManager.emitEvent({
      type: 'validated',
      timestamp: new Date(),
      scriptPath: '/path/to/validated-script.sh',
      details: { score: 85 }
    });
    
    scriptEventManager.emitEvent({
      type: 'error',
      timestamp: new Date(),
      scriptPath: '/path/to/error-script.sh',
      error: new Error('Sintaxis inválida en línea 42')
    });
    
    console.log('✅ Eventos procesados correctamente');
    
  } catch (error: any) {
    console.error('Error en ejemplo 6:', error.message);
  }
}

/**
 * Función principal que ejecuta todos los ejemplos
 */
export async function runAllExamples() {
  console.log('🚀 Ejecutando todos los ejemplos de la librería de scripts\n');
  
  try {
    await createBasicJavaServerScript();
    await createServerPropertiesFile();
    await createAdvancedShellScript();
    await analyzeExistingScript();
    await useScriptTemplates();
    await demonstrateEventHandling();
    
    console.log('\n🎉 Todos los ejemplos ejecutados correctamente');
    console.log('\n📚 Archivos creados:');
    console.log('   - minecraft-server.bat/sh (script básico)');
    console.log('   - server.properties (configuración)');
    console.log('   - advanced-server.sh (script avanzado)');
    console.log('   - template-server.sh (desde template)');
    
  } catch (error: any) {
    console.error('Error ejecutando ejemplos:', error.message);
  }
}

// Ejecutar ejemplos si este archivo se ejecuta directamente
  runAllExamples().catch(console.error);
