import fs from 'node:fs/promises';
import path from 'node:path';
import {type ServiceResponse, asyncHandler } from './file.utils.js';
import type{
  AdvancedShellScriptConfig,
  AdvancedBatchScriptConfig,
  AdvancedPropertiesConfig,
  AdvancedPowerShellScriptConfig,
  DetailedScriptAnalysis,
  AdvancedScriptValidation,
  ScriptGenerationOptions,
  AdvancedScriptModifyOptions,
  ScriptTemplate,
  ScriptEvent,
  ScriptEventListener,
  EnvironmentVariable,
  ScriptCommand,
  ScriptDependency,
  ScriptEncoding,
  LogLevel
} from './script-types.js';
import { ScriptUtils } from './script-utils.js';
import { CommandUtils } from './command-utils.js';

// ===== GESTIÓN DE EVENTOS =====

class ScriptEventManager {
  private listeners: Map<string, ScriptEventListener[]> = new Map();
  
  addEventListener(eventType: string, listener: ScriptEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }
  
  removeEventListener(eventType: string, listener: ScriptEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  emitEvent(event: ScriptEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error en listener de evento ${event.type}:`, error);
        }
      });
    }
  }
}

const eventManager = new ScriptEventManager();

// ===== UTILIDADES INTERNAS AVANZADAS =====

/**
 * Calcula la complejidad ciclomática de un script
 */
function _calculateCyclomaticComplexity(content: string, scriptType: string): number {
  let complexity = 1; // complejidad base
  
  const lines = content.split('\n');
  
  lines.forEach(line => {
    const trimmedLine = line.trim().toLowerCase();
    
    // Estructuras de control que aumentan la complejidad
    const controlStructures = [
      'if', 'elif', 'else if', 'elseif',
      'while', 'for', 'foreach',
      'case', 'switch',
      'catch', 'except',
      '&&', '||', 'and', 'or'
    ];
    
    controlStructures.forEach(structure => {
      if (trimmedLine.includes(structure)) {
        complexity++;
      }
    });
  });
  
  return complexity;
}

/**
 * Calcula la ratio de comentarios
 */
function _calculateCommentRatio(content: string, scriptType: string): number {
  const lines = content.split('\n');
  let commentLines = 0;
  let codeLines = 0;
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return; // ignorar líneas vacías
    
    const isComment = (
      trimmedLine.startsWith('#') ||
      trimmedLine.startsWith('REM') ||
      trimmedLine.startsWith('::') ||
      trimmedLine.startsWith('//')
    );
    
    if (isComment) {
      commentLines++;
    } else {
      codeLines++;
    }
  });
  
  return codeLines > 0 ? (commentLines / (commentLines + codeLines)) * 100 : 0;
}

/**
 * Analiza riesgos de seguridad en un script
 */
function _analyzeSecurityRisks(content: string, scriptType: string): string[] {
  const risks: string[] = [];
  const lines = content.split('\n');
  
  // Comandos potencialmente peligrosos
  const dangerousCommands = [
    'rm -rf', 'del /s', 'format', 'fdisk',
    'wget', 'curl', 'powershell', 'cmd',
    'eval', 'exec', 'system',
    'sudo', 'su', 'runas'
  ];
  
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    
    dangerousCommands.forEach(cmd => {
      if (lowerLine.includes(cmd)) {
        risks.push(`Línea ${index + 1}: Comando potencialmente peligroso '${cmd}'`);
      }
    });
    
    // Detectar URLs o descargas
    if (lowerLine.includes('http://') && !lowerLine.includes('https://')) {
      risks.push(`Línea ${index + 1}: Conexión HTTP no segura detectada`);
    }
    
    // Detectar ejecución de código dinámico
    if (lowerLine.includes('eval') || lowerLine.includes('exec')) {
      risks.push(`Línea ${index + 1}: Ejecución de código dinámico detectada`);
    }
  });
  
  return risks;
}

/**
 * Valida variables de entorno
 */
function _validateEnvironmentVariables(variables: EnvironmentVariable[]): string[] {
  const errors: string[] = [];
  
  variables.forEach(variable => {
    // Validar nombre
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable.name)) {
      errors.push(`Variable '${variable.name}': Nombre inválido`);
    }
    
    // Validar según tipo
    switch (variable.type) {
      case 'number':
        if (isNaN(Number(variable.value))) {
          errors.push(`Variable '${variable.name}': Valor no es un número válido`);
        }
        break;
        
      case 'boolean':
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(variable.value.toLowerCase())) {
          errors.push(`Variable '${variable.name}': Valor no es un booleano válido`);
        }
        break;
        
      case 'url':
        try {
          new URL(variable.value);
        } catch {
          errors.push(`Variable '${variable.name}': URL inválida`);
        }
        break;
        
      case 'path':
        if (!path.isAbsolute(variable.value) && !variable.value.startsWith('./') && !variable.value.startsWith('../')) {
          errors.push(`Variable '${variable.name}': Ruta debe ser absoluta o relativa válida`);
        }
        break;
    }
    
    // Validar restricciones
    if (variable.validation) {
      const { pattern, minLength, maxLength, allowedValues } = variable.validation;
      
      if (pattern && !pattern.test(variable.value)) {
        errors.push(`Variable '${variable.name}': No cumple el patrón requerido`);
      }
      
      if (minLength && variable.value.length < minLength) {
        errors.push(`Variable '${variable.name}': Longitud mínima ${minLength} caracteres`);
      }
      
      if (maxLength && variable.value.length > maxLength) {
        errors.push(`Variable '${variable.name}': Longitud máxima ${maxLength} caracteres`);
      }
      
      if (allowedValues && !allowedValues.includes(variable.value)) {
        errors.push(`Variable '${variable.name}': Valor debe ser uno de: ${allowedValues.join(', ')}`);
      }
    }
  });
  
  return errors;
}

/**
 * Verifica dependencias del sistema
 */
const _checkDependencies = async (dependencies: ScriptDependency[]): Promise<string[]> => {
  const missingDeps: string[] = [];
  
  for (const dep of dependencies) {
    try {
      if (dep.checkCommand) {
        const result = await CommandUtils.run(dep.checkCommand);
        if (!result.success) {
          missingDeps.push(`${dep.name}: ${dep.description || 'Dependencia requerida'}`);
        }
      } else {
        // Verificar si el comando está disponible
        const available = await CommandUtils.isCommandAvailable(dep.name);
        if (!available.success || !available.data) {
          missingDeps.push(`${dep.name}: ${dep.description || 'Comando no encontrado'}`);
        }
      }
    } catch (error) {
      missingDeps.push(`${dep.name}: Error al verificar dependencia`);
    }
  }
  
  return missingDeps;
};

// ===== GENERADORES AVANZADOS =====

/**
 * Genera script de shell avanzado
 */
const _generateAdvancedShellScript = async (
  config: AdvancedShellScriptConfig,
  options: ScriptGenerationOptions = {}
): Promise<string> => {
  const lines: string[] = [];
  const indent = options.indentation === 'tabs' ? '\t' : ' '.repeat(options.indentSize || 2);
  
  // Shebang
  const shebang = config.shebang || '#!/bin/bash';
  lines.push(shebang);
  lines.push('');
  
  // Header con metadatos
  if (options.includeHeader !== false) {
    lines.push('# ============================================');
    lines.push(`# Script: ${config.name}`);
    if (config.description) lines.push(`# Descripción: ${config.description}`);
    if (config.version) lines.push(`# Versión: ${config.version}`);
    if (config.author) lines.push(`# Autor: ${config.author}`);
    lines.push(`# Generado: ${new Date().toISOString()}`);
    lines.push('# ============================================');
    lines.push('');
  }
  
  // Modo estricto
  if (config.strictMode) {
    lines.push('# Modo estricto');
    lines.push('set -euo pipefail');
    lines.push('');
  }
  
  // Manejo de señales
  if (config.trapSignals && config.trapSignals.length > 0) {
    lines.push('# Manejo de señales');
    lines.push('cleanup() {');
    if (config.cleanupCommands) {
      config.cleanupCommands.forEach(cmd => {
        lines.push(`${indent}${cmd}`);
      });
    }
    lines.push(`${indent}exit 0`);
    lines.push('}');
    lines.push(`trap cleanup ${config.trapSignals.join(' ')}`);
    lines.push('');
  }
  
  // Variables de entorno
  if (config.variables && config.variables.length > 0) {
    lines.push('# Variables de entorno');
    config.variables.forEach(variable => {
      if (options.includeComments !== false && variable.description) {
        lines.push(`# ${variable.description}`);
      }
      const defaultValue = variable.defaultValue || variable.value;
      lines.push(`${variable.name}="\${${variable.name}:-${defaultValue}}"`);
    });
    lines.push('');
  }
  
  // Verificación de dependencias
  if (config.dependencies && config.dependencies.length > 0) {
    lines.push('# Verificación de dependencias');
    lines.push('check_dependencies() {');
    config.dependencies.forEach(dep => {
      if (dep.checkCommand) {
        lines.push(`${indent}if ! ${dep.checkCommand} >/dev/null 2>&1; then`);
      } else {
        lines.push(`${indent}if ! command -v ${dep.name} >/dev/null 2>&1; then`);
      }
      lines.push(`${indent}${indent}echo "Error: ${dep.description || dep.name} no está disponible"`);
      if (dep.installCommand) {
        lines.push(`${indent}${indent}echo "Instalar con: ${dep.installCommand}"`);
      }
      lines.push(`${indent}${indent}exit 1`);
      lines.push(`${indent}fi`);
    });
    lines.push('}');
    lines.push('check_dependencies');
    lines.push('');
  }
  
  // Logging
  if (config.logging?.enabled) {
    lines.push('# Configuración de logging');
    if (config.logging.outputFile) {
      lines.push(`LOG_FILE="${config.logging.outputFile}"`);
      lines.push('log() {');
      if (config.logging.includeTimestamp) {
        lines.push(`${indent}echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"`);
      } else {
        lines.push(`${indent}echo "$*" | tee -a "$LOG_FILE"`);
      }
      lines.push('}');
    } else {
      lines.push('log() { echo "$*"; }');
    }
    lines.push('');
  }
  
  // Cambio de directorio
  if (config.workingDirectory) {
    lines.push('# Cambiar al directorio de trabajo');
    lines.push(`cd "${config.workingDirectory}" || exit 1`);
    lines.push('');
  }
  
  // Comandos principales
  if (config.commands.length > 0) {
    lines.push('# Comandos principales');
    config.commands.forEach(cmd => {
      if (typeof cmd === 'string') {
        lines.push(cmd);
      } else {
        if (options.includeComments !== false && cmd.description) {
          lines.push(`# ${cmd.description}`);
        }
        
        let commandLine = cmd.command;
        
        // Agregar timeout si está especificado
        if (cmd.timeout) {
          commandLine = `timeout ${Math.floor(cmd.timeout / 1000)} ${commandLine}`;
        }
        
        // Agregar manejo de errores
        if (cmd.continueOnError) {
          commandLine += ' || true';
        }
        
        lines.push(commandLine);
      }
    });
  }
  
  return lines.join(options.lineEnding === 'crlf' ? '\r\n' : '\n');
};

/**
 * Genera script de Windows avanzado
 */
const _generateAdvancedBatchScript = async (
  config: AdvancedBatchScriptConfig,
  options: ScriptGenerationOptions = {}
): Promise<string> => {
  const lines: string[] = [];
  
  // Echo off
  if (config.echoOff !== false) {
    lines.push('@echo off');
    lines.push('');
  }
  
  // Header con metadatos
  if (options.includeHeader !== false) {
    lines.push('REM ============================================');
    lines.push(`REM Script: ${config.name}`);
    if (config.description) lines.push(`REM Descripción: ${config.description}`);
    if (config.version) lines.push(`REM Versión: ${config.version}`);
    if (config.author) lines.push(`REM Autor: ${config.author}`);
    lines.push(`REM Generado: ${new Date().toISOString()}`);
    lines.push('REM ============================================');
    lines.push('');
  }
  
  // Configuración de página de códigos
  if (config.codePage) {
    lines.push(`chcp ${config.codePage} >nul`);
    lines.push('');
  }
  
  // Extensiones y expansión retardada
  if (config.enableExtensions !== false) {
    lines.push('setlocal EnableExtensions');
  }
  if (config.delayedExpansion) {
    lines.push('setlocal EnableDelayedExpansion');
  }
  if (config.enableExtensions !== false || config.delayedExpansion) {
    lines.push('');
  }
  
  // Variables de entorno
  if (config.variables && config.variables.length > 0) {
    lines.push('REM Variables de entorno');
    config.variables.forEach(variable => {
      if (options.includeComments !== false && variable.description) {
        lines.push(`REM ${variable.description}`);
      }
      const defaultValue = variable.defaultValue || variable.value;
      lines.push(`if not defined ${variable.name} set "${variable.name}=${defaultValue}"`);
    });
    lines.push('');
  }
  
  // Verificación de dependencias
  if (config.dependencies && config.dependencies.length > 0) {
    lines.push('REM Verificación de dependencias');
    config.dependencies.forEach(dep => {
      if (dep.checkCommand) {
        lines.push(`${dep.checkCommand} >nul 2>&1`);
      } else {
        lines.push(`where ${dep.name} >nul 2>&1`);
      }
      lines.push('if errorlevel 1 (');
      lines.push(`    echo Error: ${dep.description || dep.name} no está disponible`);
      if (dep.installCommand) {
        lines.push(`    echo Instalar con: ${dep.installCommand}`);
      }
      lines.push('    exit /b 1');
      lines.push(')');
    });
    lines.push('');
  }
  
  // Cambio de directorio
  if (config.workingDirectory) {
    lines.push('REM Cambiar al directorio de trabajo');
    lines.push(`cd /d "${config.workingDirectory}"`);
    lines.push('if errorlevel 1 exit /b 1');
    lines.push('');
  }
  
  // Comandos principales
  if (config.commands.length > 0) {
    lines.push('REM Comandos principales');
    config.commands.forEach(cmd => {
      if (typeof cmd === 'string') {
        lines.push(cmd);
      } else {
        if (options.includeComments !== false && cmd.description) {
          lines.push(`REM ${cmd.description}`);
        }
        
        lines.push(cmd.command);
        
        // Manejo de errores
        if (!cmd.continueOnError && config.errorHandling === 'stop') {
          lines.push('if errorlevel 1 exit /b 1');
        }
      }
    });
  }
  
  // Pausa al final
  if (config.pauseAtEnd !== false) {
    lines.push('');
    lines.push('pause');
  }
  
  return lines.join(options.lineEnding === 'crlf' ? '\r\n' : '\n');
};

// ===== ANALIZADORES AVANZADOS =====

/**
 * Análisis detallado de script
 */
const _performDetailedAnalysis = async (filePath: string): Promise<DetailedScriptAnalysis> => {
  const content = await fs.readFile(filePath, 'utf8');
  const stats = await fs.stat(filePath);
  const basicAnalysis = await ScriptUtils.analyzeScript(filePath);
  
  if (!basicAnalysis.success) {
    throw new Error(`Error en análisis básico: ${basicAnalysis.error}`);
  }
  
  const analysis: DetailedScriptAnalysis = {
    type: basicAnalysis.data.type,
    name: path.basename(filePath),
    path: filePath,
    size: stats.size,
    encoding: 'utf8' as ScriptEncoding,
    lineCount: basicAnalysis.data.lineCount,
    variables: [],
    commands: [],
    dependencies: [],
    complexity: {
      cyclomaticComplexity: _calculateCyclomaticComplexity(content, basicAnalysis.data.type),
      linesOfCode: content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#')).length,
      commentRatio: _calculateCommentRatio(content, basicAnalysis.data.type)
    },
    issues: {
      errors: [],
      warnings: [],
      suggestions: []
    },
    securityAnalysis: {
      potentialRisks: _analyzeSecurityRisks(content, basicAnalysis.data.type),
      recommendedPermissions: basicAnalysis.data.type === 'bat' ? 'User' : '755',
      requiresElevation: content.toLowerCase().includes('sudo') || content.toLowerCase().includes('runas')
    }
  };
  
  // Convertir variables básicas a formato avanzado
  Object.entries(basicAnalysis.data.variables).forEach(([name, value]) => {
    analysis.variables.push({
      name,
      value,
      type: 'string',
      required: false
    });
  });
  
  // Convertir comandos básicos a formato avanzado
  basicAnalysis.data.commands.forEach(command => {
    analysis.commands.push({
      command,
      continueOnError: false
    });
  });
  
  return analysis;
};

/**
 * Validación avanzada de script
 */
const _performAdvancedValidation = async (filePath: string): Promise<AdvancedScriptValidation> => {
  const analysis = await _performDetailedAnalysis(filePath);
  
  const validation: AdvancedScriptValidation = {
    isValid: true,
    score: 100,
    syntax: { valid: true, errors: [] },
    security: { score: 100, risks: [], recommendations: [] },
    performance: { score: 100, bottlenecks: [], optimizations: [] },
    maintainability: { score: 100, issues: [], suggestions: [] },
    compatibility: { platforms: [], requirements: [], warnings: [] }
  };
  
  // Validación de sintaxis
  try {
    const basicValidation = await ScriptUtils.validateScript(filePath);
    if (basicValidation.success) {
      validation.syntax.valid = basicValidation.data.isValid;
      validation.syntax.errors = basicValidation.data.errors;
    }
  } catch (error: any) {
    validation.syntax.valid = false;
    validation.syntax.errors.push(`Error de validación: ${error.message}`);
  }
  
  // Análisis de seguridad
  validation.security.risks = analysis.securityAnalysis.potentialRisks;
  if (validation.security.risks.length > 0) {
    validation.security.score = Math.max(0, 100 - (validation.security.risks.length * 20));
    validation.security.recommendations.push('Revisar comandos potencialmente peligrosos');
  }
  
  // Análisis de rendimiento
  if (analysis.complexity.cyclomaticComplexity > 10) {
    validation.performance.score -= 20;
    validation.performance.bottlenecks.push('Alta complejidad ciclomática');
    validation.performance.optimizations.push('Considerar dividir en funciones más pequeñas');
  }
  
  // Análisis de mantenibilidad
  if (analysis.complexity.commentRatio < 10) {
    validation.maintainability.score -= 15;
    validation.maintainability.issues.push('Pocos comentarios en el código');
    validation.maintainability.suggestions.push('Agregar más comentarios explicativos');
  }
  
  if (analysis.complexity.linesOfCode > 500) {
    validation.maintainability.score -= 10;
    validation.maintainability.issues.push('Script muy largo');
    validation.maintainability.suggestions.push('Considerar dividir en módulos más pequeños');
  }
  
  // Calcular puntuación general
  validation.score = Math.round(
    (validation.security.score + validation.performance.score + validation.maintainability.score) / 3
  );
  
  validation.isValid = validation.syntax.valid && validation.score >= 60;
  
  return validation;
};

// ===== API PÚBLICA AVANZADA =====

/**
 * Utilidades avanzadas para scripts
 */
export const AdvancedScriptUtils = {
  /** Genera script de shell avanzado */
  generateAdvancedShellScript: asyncHandler(_generateAdvancedShellScript),
  
  /** Genera script de Windows avanzado */
  generateAdvancedBatchScript: asyncHandler(_generateAdvancedBatchScript),
  
  /** Realiza análisis detallado de script */
  performDetailedAnalysis: asyncHandler(_performDetailedAnalysis),
  
  /** Realiza validación avanzada de script */
  performAdvancedValidation: asyncHandler(_performAdvancedValidation),
  
  /** Verifica dependencias del sistema */
  checkDependencies: asyncHandler(_checkDependencies),
  
  /** Valida variables de entorno */
  validateEnvironmentVariables: _validateEnvironmentVariables,
  
  /** Calcula complejidad ciclomática */
  calculateCyclomaticComplexity: _calculateCyclomaticComplexity,
  
  /** Analiza riesgos de seguridad */
  analyzeSecurityRisks: _analyzeSecurityRisks
};

/**
 * Gestor de eventos para scripts
 */
export const scriptEventManager = {
  /** Agregar listener de eventos */
  addEventListener: eventManager.addEventListener.bind(eventManager),
  
  /** Remover listener de eventos */
  removeEventListener: eventManager.removeEventListener.bind(eventManager),
  
  /** Emitir evento */
  emitEvent: eventManager.emitEvent.bind(eventManager)
};

/**
 * Templates predefinidos de scripts
 */
export const ScriptTemplates: Record<string, ScriptTemplate> = {
  javaServer: {
    name: 'Java Server Startup',
    description: 'Template para iniciar servidores Java',
    type: 'startup',
    category: 'server',
    tags: ['java', 'server', 'minecraft'],
    content: `#!/bin/bash
# Java Server Startup Script

JAVA_PATH="{{JAVA_PATH}}"
JAR_FILE="{{JAR_FILE}}"
JVM_ARGS="{{JVM_ARGS}}"

"$JAVA_PATH" $JVM_ARGS -jar "$JAR_FILE" nogui
`,
    variables: [
      {
        name: 'JAVA_PATH',
        value: 'java',
        type: 'path',
        description: 'Ruta al ejecutable de Java',
        required: true
      },
      {
        name: 'JAR_FILE',
        value: 'server.jar',
        type: 'path',
        description: 'Archivo JAR del servidor',
        required: true
      },
      {
        name: 'JVM_ARGS',
        value: '-Xms1G -Xmx2G',
        type: 'string',
        description: 'Argumentos de la JVM',
        required: false
      }
    ],
    usage: 'Usar para iniciar servidores Java como Minecraft, Spring Boot, etc.',
    examples: [
      './start-server.sh',
      'JAVA_PATH=/usr/bin/java ./start-server.sh'
    ]
  },
  
  backupScript: {
    name: 'Backup Script',
    description: 'Template para scripts de respaldo',
    type: 'maintenance',
    category: 'backup',
    tags: ['backup', 'maintenance', 'automation'],
    content: `#!/bin/bash
# Backup Script

SOURCE_DIR="{{SOURCE_DIR}}"
BACKUP_DIR="{{BACKUP_DIR}}"
DATE=$(date +%Y%m%d_%H%M%S)

tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$SOURCE_DIR"
echo "Backup completado: backup_$DATE.tar.gz"
`,
    variables: [
      {
        name: 'SOURCE_DIR',
        value: '/path/to/source',
        type: 'path',
        description: 'Directorio a respaldar',
        required: true
      },
      {
        name: 'BACKUP_DIR',
        value: '/path/to/backup',
        type: 'path',
        description: 'Directorio de destino',
        required: true
      }
    ],
    usage: 'Crear respaldos automáticos de directorios',
    examples: [
      './backup.sh',
      'SOURCE_DIR=/home/user BACKUP_DIR=/backups ./backup.sh'
    ]
  }
};