/**
 * Índice principal de utilidades
 * Exporta todas las funcionalidades de la librería de utilidades
 */

// ===== UTILIDADES BÁSICAS =====
export * from './file.utils.js';
export * from './command-utils.js';
export * from './validator.js';

// ===== UTILIDADES DE SCRIPTS =====
export * from './script-utils.js';
export * from './script-types.js';
export * from './advanced-script-utils.js';

// ===== EJEMPLOS Y DOCUMENTACIÓN =====
export * from '../../examples/script-examples.js';

// ===== EXPORTACIONES ESPECÍFICAS PARA FACILITAR EL USO =====

// Utilidades básicas de archivos
export { FileUtils } from './file.utils.js';
export { CommandUtils } from './command-utils.js';
export { createSuccessResponse, createErrorResponse, isSuccess } from './validator.js';

// Utilidades de scripts básicas
export { ScriptUtils, PlatformScriptUtils } from './script-utils.js';

// Utilidades de scripts avanzadas
export { AdvancedScriptUtils, scriptEventManager, ScriptTemplates } from './advanced-script-utils.js';

// Ejemplos
export {
  createBasicJavaServerScript,
  createServerPropertiesFile,
  createAdvancedShellScript,
  analyzeExistingScript,
  useScriptTemplates,
  demonstrateEventHandling,
  runAllExamples
} from '../../examples/script-examples.js';

// ===== TIPOS PRINCIPALES =====
import type {
  // Tipos básicos,
  
  // Tipos de scripts básicos
  ScriptType,
  BaseScriptConfig,
  ShellScriptConfig,
  BatchScriptConfig,
  PropertiesConfig,
  PowerShellScriptConfig,
  ScriptAnalysis,
  ScriptModifyOptions,
  ScriptValidation,
  
  // Tipos avanzados
  ScriptEncoding,
  LogLevel,
  EnvironmentVariableType,
  ExecutionMode,
  EnvironmentVariable,
  ScriptCommand,
  ScriptLogging,
  ScriptSecurity,
  ScriptDependency,
  AdvancedShellScriptConfig,
  AdvancedBatchScriptConfig,
  AdvancedPropertiesConfig,
  AdvancedPowerShellScriptConfig,
  DetailedScriptAnalysis,
  AdvancedScriptValidation,
  ScriptGenerationOptions,
  AdvancedScriptModifyOptions,
  ScriptLibraryConfig,
  ScriptTemplate,
  ScriptEvent,
  ScriptEventListener
} from './script-types.js';
export type{
  // Tipos básicos,
  
  // Tipos de scripts básicos
  ScriptType,
  BaseScriptConfig,
  ShellScriptConfig,
  BatchScriptConfig,
  PropertiesConfig,
  PowerShellScriptConfig,
  ScriptAnalysis,
  ScriptModifyOptions,
  ScriptValidation,
  
  // Tipos avanzados
  ScriptEncoding,
  LogLevel,
  EnvironmentVariableType,
  ExecutionMode,
  EnvironmentVariable,
  ScriptCommand,
  ScriptLogging,
  ScriptSecurity,
  ScriptDependency,
  AdvancedShellScriptConfig,
  AdvancedBatchScriptConfig,
  AdvancedPropertiesConfig,
  AdvancedPowerShellScriptConfig,
  DetailedScriptAnalysis,
  AdvancedScriptValidation,
  ScriptGenerationOptions,
  AdvancedScriptModifyOptions,
  ScriptLibraryConfig,
  ScriptTemplate,
  ScriptEvent,
  ScriptEventListener
}
// ===== CONSTANTES Y CONFIGURACIONES =====

/**
 * Configuración por defecto para la librería de scripts
 */
export const DEFAULT_SCRIPT_CONFIG = {
  encoding: 'utf8' as const,
  permissions: '755',
  shebang: '#!/bin/bash',
  indentation: 'spaces' as const,
  indentSize: 2,
  lineEnding: 'lf' as const,
  includeHeader: true,
  includeComments: true,
  enableValidation: true,
  autoBackup: true
};

/**
 * Extensiones de archivo soportadas para scripts
 */
export const SUPPORTED_SCRIPT_EXTENSIONS = [
  '.sh',
  '.bash',
  '.bat',
  '.cmd',
  '.ps1',
  '.properties',
  '.conf',
  '.ini'
] as const;

/**
 * Comandos potencialmente peligrosos que requieren atención especial
 */
export const DANGEROUS_COMMANDS = [
  'rm -rf',
  'del /s',
  'format',
  'fdisk',
  'dd',
  'mkfs',
  'sudo rm',
  'sudo dd',
  'eval',
  'exec',
  'system'
] as const;

/**
 * Niveles de logging disponibles
 */
export const LOG_LEVELS = [
  'debug',
  'info',
  'warn',
  'error',
  'silent'
] as const;

// ===== UTILIDADES DE CONVENIENCIA =====

/**
 * Crea una configuración básica para script de shell
 */
export function createShellScriptConfig(
  name: string,
  commands: string[],
  options: Partial<ShellScriptConfig> = {}
): ShellScriptConfig {
  return {
    name,
    commands,
    shebang: '#!/bin/bash',
    variables: {},
    ...options
  };
}

/**
 * Crea una configuración básica para script de Windows
 */
export function createBatchScriptConfig(
  name: string,
  commands: string[],
  options: Partial<BatchScriptConfig> = {}
): BatchScriptConfig {
  return {
    name,
    commands,
    variables: {},
    echoOff: true,
    pauseAtEnd: true,
    ...options
  };
}

/**
 * Crea una configuración básica para archivo de propiedades
 */
export function createPropertiesConfig(
  name: string,
  properties: Record<string, string | number | boolean>,
  options: Partial<PropertiesConfig> = {}
): PropertiesConfig {
  return {
    name,
    properties,
    comments: {},
    sections: {},
    ...options
  };
}

/**
 * Detecta el tipo de script apropiado para la plataforma actual
 */
export function detectPlatformScriptType(): ScriptType {
  const platform = process.platform;
  
  switch (platform) {
    case 'win32':
      return 'bat';
    case 'darwin':
    case 'linux':
      return 'bash';
    default:
      return 'sh';
  }
}

/**
 * Valida si una extensión de archivo es soportada
 */
export function isSupportedScriptExtension(extension: string): boolean {
  return SUPPORTED_SCRIPT_EXTENSIONS.includes(extension.toLowerCase() as any);
}

/**
 * Obtiene la extensión apropiada para un tipo de script
 */
export function getScriptExtension(scriptType: ScriptType): string {
  switch (scriptType) {
    case 'bash':
      return '.bash';
    case 'sh':
      return '.sh';
    case 'bat':
      return '.bat';
    case 'ps1':
      return '.ps1';
    case 'properties':
      return '.properties';
    default:
      return '.txt';
  }
}

/**
 * Crea un nombre de archivo completo con la extensión apropiada
 */
export function createScriptFileName(name: string, scriptType: ScriptType): string {
  const extension = getScriptExtension(scriptType);
  return name.endsWith(extension) ? name : `${name}${extension}`;
}

// ===== DOCUMENTACIÓN Y AYUDA =====

/**
 * Información sobre la librería
 */
export const LIBRARY_INFO = {
  name: 'Java Manager Script Utils',
  version: '1.0.0',
  description: 'Librería completa de utilidades para manejar scripts de inicio (.bash, .bat, .properties)',
  features: [
    'Generación de scripts multiplataforma',
    'Análisis y validación de scripts existentes',
    'Manejo seguro de variables de entorno',
    'Templates predefinidos',
    'Validación de seguridad',
    'Análisis de complejidad',
    'Sistema de eventos',
    'Soporte para múltiples formatos'
  ],
  supportedTypes: ['bash', 'sh', 'bat', 'ps1', 'properties'],
  platforms: ['Windows', 'Linux', 'macOS', 'Android (Termux)']
};

/**
 * Muestra información de ayuda sobre la librería
 */
export function showHelp(): void {
  console.log(`\n🔧 ${LIBRARY_INFO.name} v${LIBRARY_INFO.version}`);
  console.log(`📝 ${LIBRARY_INFO.description}\n`);
  
  console.log('✨ Características:');
  LIBRARY_INFO.features.forEach(feature => {
    console.log(`   • ${feature}`);
  });
  
  console.log('\n📄 Tipos de script soportados:');
  LIBRARY_INFO.supportedTypes.forEach(type => {
    console.log(`   • ${type}`);
  });
  
  console.log('\n🖥️  Plataformas soportadas:');
  LIBRARY_INFO.platforms.forEach(platform => {
    console.log(`   • ${platform}`);
  });
  
  console.log('\n📚 Uso básico:');
  console.log('   import { ScriptUtils, PlatformScriptUtils } from "./utils";');
  console.log('   ');
  console.log('   // Crear script básico');
  console.log('   const result = await PlatformScriptUtils.createStartupScript(config);');
  console.log('   ');
  console.log('   // Analizar script existente');
  console.log('   const analysis = await ScriptUtils.analyzeScript("./script.sh");');
  console.log('   ');
  console.log('   // Validar script');
  console.log('   const validation = await ScriptUtils.validateScript("./script.sh");');
  
  console.log('\n💡 Para ver ejemplos completos, ejecuta:');
  console.log('   import { runAllExamples } from "./utils";');
  console.log('   await runAllExamples();');
}

// ===== EXPORTACIÓN POR DEFECTO =====

/**
 * Exportación por defecto con las utilidades más comunes
 */
export default {
  
  // Funciones de conveniencia
  createShellScriptConfig,
  createBatchScriptConfig,
  createPropertiesConfig,
  detectPlatformScriptType,
  isSupportedScriptExtension,
  getScriptExtension,
  createScriptFileName,
  
  // Información y ayuda
  LIBRARY_INFO,
  showHelp,
  
  // Configuración
  DEFAULT_SCRIPT_CONFIG,
  SUPPORTED_SCRIPT_EXTENSIONS,
  DANGEROUS_COMMANDS,
  LOG_LEVELS
};