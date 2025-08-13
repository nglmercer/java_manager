/**
 * Tipos y interfaces adicionales para la librería de utilidades de scripts
 * Proporciona tipos más específicos y configuraciones avanzadas
 */

// ===== TIPOS BASE =====

/**
 * Tipos de encoding soportados para archivos de script
 */
export type ScriptEncoding = 'utf8' | 'utf16le' | 'latin1' | 'ascii';

/**
 * Niveles de logging para scripts
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Tipos de variables de entorno
 */
export type EnvironmentVariableType = 'string' | 'number' | 'boolean' | 'path' | 'url';

/**
 * Modos de ejecución para scripts
 */
export type ExecutionMode = 'sync' | 'async' | 'background' | 'scheduled';

// ===== INTERFACES AVANZADAS =====

/**
 * Variable de entorno con metadatos
 */
export interface EnvironmentVariable {
  name: string;
  value: string;
  type: EnvironmentVariableType;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    allowedValues?: string[];
  };
}

/**
 * Comando con metadatos y opciones
 */
export interface ScriptCommand {
  command: string;
  description?: string;
  timeout?: number; // en milisegundos
  retries?: number;
  continueOnError?: boolean;
  workingDirectory?: string;
  environment?: Record<string, string>;
  condition?: string; // condición para ejecutar el comando
}

/**
 * Configuración de logging para scripts
 */
export interface ScriptLogging {
  enabled: boolean;
  level: LogLevel;
  outputFile?: string;
  rotateSize?: number; // en bytes
  maxFiles?: number;
  includeTimestamp?: boolean;
  includeLevel?: boolean;
}

/**
 * Configuración de seguridad para scripts
 */
export interface ScriptSecurity {
  allowedCommands?: string[]; // lista blanca de comandos
  blockedCommands?: string[]; // lista negra de comandos
  requireElevation?: boolean;
  sandboxMode?: boolean;
  maxExecutionTime?: number; // en milisegundos
  allowNetworkAccess?: boolean;
  allowFileSystemAccess?: boolean;
}

/**
 * Configuración de dependencias para scripts
 */
export interface ScriptDependency {
  name: string;
  version?: string;
  required: boolean;
  installCommand?: string;
  checkCommand?: string;
  description?: string;
}

/**
 * Configuración avanzada para scripts de shell
 */
export interface AdvancedShellScriptConfig {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  shebang?: string;
  
  // Variables y entorno
  variables?: EnvironmentVariable[];
  environmentFile?: string; // archivo .env a cargar
  
  // Comandos y ejecución
  commands: ScriptCommand[];
  preCommands?: ScriptCommand[]; // comandos a ejecutar antes
  postCommands?: ScriptCommand[]; // comandos a ejecutar después
  
  // Configuración de ejecución
  workingDirectory?: string;
  executionMode?: ExecutionMode;
  permissions?: string;
  
  // Dependencias
  dependencies?: ScriptDependency[];
  
  // Logging y debugging
  logging?: ScriptLogging;
  debugMode?: boolean;
  
  // Seguridad
  security?: ScriptSecurity;
  
  // Configuración específica de shell
  strictMode?: boolean; // set -e, set -u, set -o pipefail
  trapSignals?: string[]; // señales a capturar
  cleanupCommands?: string[]; // comandos de limpieza
}

/**
 * Configuración avanzada para scripts de Windows
 */
export interface AdvancedBatchScriptConfig {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  
  // Variables y entorno
  variables?: EnvironmentVariable[];
  environmentFile?: string;
  
  // Comandos y ejecución
  commands: ScriptCommand[];
  preCommands?: ScriptCommand[];
  postCommands?: ScriptCommand[];
  
  // Configuración de ejecución
  workingDirectory?: string;
  executionMode?: ExecutionMode;
  
  // Dependencias
  dependencies?: ScriptDependency[];
  
  // Logging y debugging
  logging?: ScriptLogging;
  debugMode?: boolean;
  
  // Seguridad
  security?: ScriptSecurity;
  
  // Configuración específica de batch
  echoOff?: boolean;
  pauseAtEnd?: boolean;
  enableExtensions?: boolean;
  delayedExpansion?: boolean;
  codePage?: number; // página de códigos
  errorHandling?: 'continue' | 'stop' | 'custom';
}

/**
 * Configuración avanzada para archivos de propiedades
 */
export interface AdvancedPropertiesConfig {
  name: string;
  description?: string;
  version?: string;
  
  // Propiedades principales
  properties: Record<string, {
    value: string | number | boolean;
    type?: EnvironmentVariableType;
    description?: string;
    category?: string;
    required?: boolean;
    validation?: {
      pattern?: RegExp;
      min?: number;
      max?: number;
      allowedValues?: (string | number | boolean)[];
    };
  }>;
  
  // Organización
  sections?: Record<string, {
    description?: string;
    properties: Record<string, any>;
  }>;
  
  // Metadatos
  encoding?: ScriptEncoding;
  includeTimestamp?: boolean;
  includeVersion?: boolean;
  
  // Validación
  strictMode?: boolean;
  allowUnknownProperties?: boolean;
}

/**
 * Configuración avanzada para scripts de PowerShell
 */
export interface AdvancedPowerShellScriptConfig {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  
  // Variables y entorno
  variables?: EnvironmentVariable[];
  parameters?: {
    name: string;
    type: string;
    mandatory?: boolean;
    defaultValue?: any;
    description?: string;
    validation?: string[];
  }[];
  
  // Comandos y ejecución
  commands: ScriptCommand[];
  preCommands?: ScriptCommand[];
  postCommands?: ScriptCommand[];
  
  // Configuración de ejecución
  workingDirectory?: string;
  executionPolicy?: 'Restricted' | 'AllSigned' | 'RemoteSigned' | 'Unrestricted' | 'Bypass';
  requiresElevation?: boolean;
  
  // Dependencias
  dependencies?: ScriptDependency[];
  modules?: string[]; // módulos de PowerShell requeridos
  
  // Logging y debugging
  logging?: ScriptLogging;
  debugMode?: boolean;
  verboseMode?: boolean;
  
  // Seguridad
  security?: ScriptSecurity;
  
  // Configuración específica de PowerShell
  strictMode?: boolean;
  errorActionPreference?: 'Stop' | 'Continue' | 'SilentlyContinue' | 'Inquire';
  warningPreference?: 'Stop' | 'Continue' | 'SilentlyContinue' | 'Inquire';
  progressPreference?: 'Stop' | 'Continue' | 'SilentlyContinue';
}

// ===== TIPOS DE RESULTADO =====

/**
 * Resultado detallado de análisis de script
 */
export interface DetailedScriptAnalysis {
  // Información básica
  type: string;
  name: string;
  path: string;
  size: number;
  encoding: ScriptEncoding;
  lineCount: number;
  
  // Contenido
  variables: EnvironmentVariable[];
  commands: ScriptCommand[];
  dependencies: ScriptDependency[];
  
  // Metadatos
  hasShebang?: boolean;
  shebang?: string;
  version?: string;
  author?: string;
  description?: string;
  
  // Análisis de calidad
  complexity: {
    cyclomaticComplexity: number;
    linesOfCode: number;
    commentRatio: number;
  };
  
  // Problemas detectados
  issues: {
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
  
  // Seguridad
  securityAnalysis: {
    potentialRisks: string[];
    recommendedPermissions: string;
    requiresElevation: boolean;
  };
}

/**
 * Resultado de validación avanzada
 */
export interface AdvancedScriptValidation {
  isValid: boolean;
  score: number; // puntuación de calidad (0-100)
  
  // Categorías de validación
  syntax: {
    valid: boolean;
    errors: string[];
  };
  
  security: {
    score: number;
    risks: string[];
    recommendations: string[];
  };
  
  performance: {
    score: number;
    bottlenecks: string[];
    optimizations: string[];
  };
  
  maintainability: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  
  compatibility: {
    platforms: string[];
    requirements: string[];
    warnings: string[];
  };
}

/**
 * Opciones de generación de scripts
 */
export interface ScriptGenerationOptions {
  // Formato y estilo
  indentation?: 'spaces' | 'tabs';
  indentSize?: number;
  lineEnding?: 'lf' | 'crlf' | 'auto';
  encoding?: ScriptEncoding;
  
  // Contenido
  includeHeader?: boolean;
  includeComments?: boolean;
  includeErrorHandling?: boolean;
  includeLogging?: boolean;
  
  // Optimización
  minify?: boolean;
  removeComments?: boolean;
  optimizeCommands?: boolean;
  
  // Validación
  validateSyntax?: boolean;
  validateSecurity?: boolean;
  strictMode?: boolean;
}

/**
 * Opciones de modificación de scripts
 */
export interface AdvancedScriptModifyOptions {
  // Backup
  backup?: boolean;
  backupPath?: string;
  backupSuffix?: string;
  
  // Preservación
  preserveComments?: boolean;
  preserveFormatting?: boolean;
  preservePermissions?: boolean;
  preserveTimestamps?: boolean;
  
  // Validación
  validateBeforeModify?: boolean;
  validateAfterModify?: boolean;
  
  // Logging
  logChanges?: boolean;
  logPath?: string;
  
  // Seguridad
  requireConfirmation?: boolean;
  dryRun?: boolean;
}

// ===== TIPOS DE CONFIGURACIÓN =====

/**
 * Configuración global para la librería de scripts
 */
export interface ScriptLibraryConfig {
  // Rutas por defecto
  defaultScriptPath?: string;
  defaultBackupPath?: string;
  defaultLogPath?: string;
  
  // Configuración por defecto
  defaultEncoding?: ScriptEncoding;
  defaultPermissions?: string;
  defaultShebang?: string;
  
  // Seguridad
  enableSandbox?: boolean;
  allowedCommands?: string[];
  blockedCommands?: string[];
  maxExecutionTime?: number;
  
  // Logging
  enableLogging?: boolean;
  logLevel?: LogLevel;
  logRotation?: boolean;
  
  // Validación
  enableValidation?: boolean;
  strictMode?: boolean;
  autoBackup?: boolean;
}

/**
 * Template de script predefinido
 */
export interface ScriptTemplate {
  name: string;
  description: string;
  type: string;
  category: string;
  tags: string[];
  
  // Contenido del template
  content: string;
  variables?: EnvironmentVariable[];
  
  // Metadatos
  author?: string;
  version?: string;
  license?: string;
  
  // Configuración
  defaultConfig?: any;
  requiredDependencies?: ScriptDependency[];
  
  // Documentación
  usage?: string;
  examples?: string[];
}

// ===== TIPOS DE EVENTOS =====

/**
 * Evento de script
 */
export interface ScriptEvent {
  type: 'created' | 'modified' | 'deleted' | 'executed' | 'validated' | 'error';
  timestamp: Date;
  scriptPath: string;
  details?: any;
  error?: Error;
}

/**
 * Listener de eventos de script
 */
export type ScriptEventListener = (event: ScriptEvent) => void;

// ===== EXPORTACIONES =====

export * from './script-utils.js';