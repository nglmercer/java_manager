import fs from 'node:fs/promises';
import path from 'node:path';
import {type ServiceResponse, asyncHandler } from './file.utils.js';
import { getPlatformInfo } from '../core/server/serverconfig.js';

// ===== TIPOS Y INTERFACES =====

/**
 * Tipos de archivos de script soportados
 */
export type ScriptType = 'bash' | 'bat' | 'properties' | 'sh' | 'ps1';

/**
 * Configuración base para scripts
 */
export interface BaseScriptConfig {
  name: string;
  description?: string;
  encoding?: BufferEncoding;
}

/**
 * Configuración específica para scripts de shell (bash/sh)
 */
export interface ShellScriptConfig extends BaseScriptConfig {
  shebang?: string;
  commands: string[];
  variables?: Record<string, string>;
  workingDirectory?: string;
  permissions?: string; // e.g., '755'
}

/**
 * Configuración específica para scripts de Windows (bat)
 */
export interface BatchScriptConfig extends BaseScriptConfig {
  commands: string[];
  variables?: Record<string, string>;
  workingDirectory?: string;
  echoOff?: boolean;
  pauseAtEnd?: boolean;
}

/**
 * Configuración específica para archivos de propiedades
 */
export interface PropertiesConfig extends BaseScriptConfig {
  properties: Record<string, string | number | boolean>;
  comments?: Record<string, string>; // key -> comment
  sections?: Record<string, Record<string, string | number | boolean>>;
}

/**
 * Configuración específica para scripts de PowerShell
 */
export interface PowerShellScriptConfig extends BaseScriptConfig {
  commands: string[];
  variables?: Record<string, any>;
  workingDirectory?: string;
  executionPolicy?: 'Restricted' | 'AllSigned' | 'RemoteSigned' | 'Unrestricted' | 'Bypass';
}

/**
 * Resultado de análisis de script
 */
export interface ScriptAnalysis {
  type: ScriptType;
  variables: Record<string, string>;
  commands: string[];
  comments: string[];
  lineCount: number;
  encoding: string;
  hasShebang?: boolean;
  shebang?: string;
}

/**
 * Opciones para modificar scripts
 */
export interface ScriptModifyOptions {
  backup?: boolean;
  backupSuffix?: string;
  preserveComments?: boolean;
  preserveFormatting?: boolean;
}

/**
 * Resultado de validación de script
 */
export interface ScriptValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ===== UTILIDADES INTERNAS =====

/**
 * Detecta el tipo de script basado en la extensión del archivo
 */
function _detectScriptType(filePath: string): ScriptType {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.bash':
      return 'bash';
    case '.bat':
      return 'bat';
    case '.properties':
      return 'properties';
    case '.sh':
      return 'sh';
    case '.ps1':
      return 'ps1';
    default:
      throw new Error(`Tipo de script no soportado: ${ext}`);
  }
}

/**
 * Escapa caracteres especiales para diferentes tipos de script
 */
function _escapeValue(value: string, scriptType: ScriptType): string {
  switch (scriptType) {
    case 'bash':
    case 'sh':
      return value.replace(/'/g, "'\"'\"'").replace(/"/g, '\\"');
    case 'bat':
      return value.replace(/%/g, '%%').replace(/"/g, '""');
    case 'properties':
      return value.replace(/[=:]/g, '\\$&').replace(/\n/g, '\\n');
    case 'ps1':
      return value.replace(/'/g, "''").replace(/"/g, '`"');
    default:
      return value;
  }
}

/**
 * Genera el shebang apropiado para scripts de shell
 */
function _generateShebang(scriptType: ScriptType, customShebang?: string): string {
  if (customShebang) return customShebang;
  
  switch (scriptType) {
    case 'bash':
      return '#!/bin/bash';
    case 'sh':
      return '#!/bin/sh';
    default:
      return '';
  }
}

// ===== GENERADORES DE SCRIPTS =====

/**
 * Genera contenido para script de shell (bash/sh)
 */
const _generateShellScript = async (config: ShellScriptConfig, scriptType: ScriptType): Promise<string> => {
  const lines: string[] = [];
  
  // Shebang
  const shebang = _generateShebang(scriptType, config.shebang);
  if (shebang) {
    lines.push(shebang);
    lines.push('');
  }
  
  // Descripción
  if (config.description) {
    lines.push(`# ${config.description}`);
    lines.push('');
  }
  
  // Variables
  if (config.variables) {
    lines.push('# Variables');
    Object.entries(config.variables).forEach(([key, value]) => {
      const escapedValue = _escapeValue(value, scriptType);
      lines.push(`${key}="${escapedValue}"`);
    });
    lines.push('');
  }
  
  // Cambio de directorio
  if (config.workingDirectory) {
    lines.push('# Cambiar al directorio de trabajo');
    lines.push(`cd "${config.workingDirectory}"`);
    lines.push('');
  }
  
  // Comandos
  if (config.commands.length > 0) {
    lines.push('# Comandos principales');
    config.commands.forEach(command => {
      lines.push(command);
    });
  }
  
  return lines.join('\n');
};

/**
 * Genera contenido para script de Windows (bat)
 */
const _generateBatchScript = async (config: BatchScriptConfig): Promise<string> => {
  const lines: string[] = [];
  
  // Echo off
  if (config.echoOff !== false) {
    lines.push('@echo off');
    lines.push('');
  }
  
  // Descripción
  if (config.description) {
    lines.push(`REM ${config.description}`);
    lines.push('');
  }
  
  // Variables
  if (config.variables) {
    lines.push('REM Variables');
    Object.entries(config.variables).forEach(([key, value]) => {
      const escapedValue = _escapeValue(value, 'bat');
      lines.push(`set "${key}=${escapedValue}"`);
    });
    lines.push('');
  }
  
  // Cambio de directorio
  if (config.workingDirectory) {
    lines.push('REM Cambiar al directorio de trabajo');
    lines.push(`cd /d "${config.workingDirectory}"`);
    lines.push('');
  }
  
  // Comandos
  if (config.commands.length > 0) {
    lines.push('REM Comandos principales');
    config.commands.forEach(command => {
      lines.push(command);
    });
  }
  
  // Pausa al final
  if (config.pauseAtEnd !== false) {
    lines.push('');
    lines.push('pause');
  }
  
  return lines.join('\n');
};

/**
 * Genera contenido para archivo de propiedades
 */
const _generatePropertiesFile = async (config: PropertiesConfig): Promise<string> => {
  const lines: string[] = [];
  
  // Descripción
  if (config.description) {
    lines.push(`# ${config.description}`);
    lines.push('');
  }
  
  // Propiedades principales
  if (config.properties) {
    Object.entries(config.properties).forEach(([key, value]) => {
      // Comentario para la propiedad
      if (config.comments && config.comments[key]) {
        lines.push(`# ${config.comments[key]}`);
      }
      
      const escapedValue = _escapeValue(String(value), 'properties');
      lines.push(`${key}=${escapedValue}`);
    });
  }
  
  // Secciones
  if (config.sections) {
    Object.entries(config.sections).forEach(([sectionName, sectionProps]) => {
      lines.push('');
      lines.push(`# ${sectionName}`);
      Object.entries(sectionProps).forEach(([key, value]) => {
        const escapedValue = _escapeValue(String(value), 'properties');
        lines.push(`${key}=${escapedValue}`);
      });
    });
  }
  
  return lines.join('\n');
};

/**
 * Genera contenido para script de PowerShell
 */
const _generatePowerShellScript = async (config: PowerShellScriptConfig): Promise<string> => {
  const lines: string[] = [];
  
  // Política de ejecución
  if (config.executionPolicy) {
    lines.push(`# Execution Policy: ${config.executionPolicy}`);
    lines.push('');
  }
  
  // Descripción
  if (config.description) {
    lines.push(`# ${config.description}`);
    lines.push('');
  }
  
  // Variables
  if (config.variables) {
    lines.push('# Variables');
    Object.entries(config.variables).forEach(([key, value]) => {
      const escapedValue = _escapeValue(String(value), 'ps1');
      lines.push(`$${key} = "${escapedValue}"`);
    });
    lines.push('');
  }
  
  // Cambio de directorio
  if (config.workingDirectory) {
    lines.push('# Cambiar al directorio de trabajo');
    lines.push(`Set-Location "${config.workingDirectory}"`);
    lines.push('');
  }
  
  // Comandos
  if (config.commands.length > 0) {
    lines.push('# Comandos principales');
    config.commands.forEach(command => {
      lines.push(command);
    });
  }
  
  return lines.join('\n');
};

// ===== ANALIZADORES DE SCRIPTS =====

/**
 * Analiza un script existente
 */
const _analyzeScript = async (filePath: string): Promise<ScriptAnalysis> => {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const scriptType = _detectScriptType(filePath);
  
  const analysis: ScriptAnalysis = {
    type: scriptType,
    variables: {},
    commands: [],
    comments: [],
    lineCount: lines.length,
    encoding: 'utf8'
  };
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Detectar shebang
    if (index === 0 && trimmedLine.startsWith('#!')) {
      analysis.hasShebang = true;
      analysis.shebang = trimmedLine;
      return;
    }
    
    // Detectar comentarios
    if (trimmedLine.startsWith('#') || trimmedLine.startsWith('REM') || trimmedLine.startsWith('::')) {
      analysis.comments.push(trimmedLine);
      return;
    }
    
    // Detectar variables según el tipo de script
    switch (scriptType) {
      case 'bash':
      case 'sh':
        const bashVarMatch = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (bashVarMatch) {
          analysis.variables[bashVarMatch[1]] = bashVarMatch[2].replace(/^["']|["']$/g, '');
        } else if (trimmedLine && !trimmedLine.startsWith('#')) {
          analysis.commands.push(trimmedLine);
        }
        break;
        
      case 'bat':
        const batVarMatch = trimmedLine.match(/^set\s+["']?([^=]+)=(.+)["']?$/i);
        if (batVarMatch) {
          analysis.variables[batVarMatch[1]] = batVarMatch[2].replace(/^["']|["']$/g, '');
        } else if (trimmedLine && !trimmedLine.toLowerCase().startsWith('rem') && !trimmedLine.startsWith('::')) {
          analysis.commands.push(trimmedLine);
        }
        break;
        
      case 'properties':
        const propMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (propMatch) {
          analysis.variables[propMatch[1].trim()] = propMatch[2].trim();
        }
        break;
        
      case 'ps1':
        const ps1VarMatch = trimmedLine.match(/^\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (ps1VarMatch) {
          analysis.variables[ps1VarMatch[1]] = ps1VarMatch[2].replace(/^["']|["']$/g, '');
        } else if (trimmedLine && !trimmedLine.startsWith('#')) {
          analysis.commands.push(trimmedLine);
        }
        break;
    }
  });
  
  return analysis;
};

// ===== VALIDADORES =====

/**
 * Valida un script
 */
const _validateScript = async (filePath: string): Promise<ScriptValidation> => {
  const validation: ScriptValidation = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };
  
  try {
    const analysis = await _analyzeScript(filePath);
    const scriptType = analysis.type;
    
    // Validaciones específicas por tipo
    switch (scriptType) {
      case 'bash':
      case 'sh':
        if (!analysis.hasShebang) {
          validation.warnings.push('El script no tiene shebang. Se recomienda agregar #!/bin/bash o #!/bin/sh');
        }
        break;
        
      case 'bat':
        if (!analysis.commands.some(cmd => cmd.toLowerCase().includes('@echo off'))) {
          validation.suggestions.push('Considera agregar @echo off al inicio del script');
        }
        break;
        
      case 'properties':
        // Validar formato de propiedades
        Object.keys(analysis.variables).forEach(key => {
          if (key.includes(' ')) {
            validation.warnings.push(`La clave '${key}' contiene espacios, lo cual puede causar problemas`);
          }
        });
        break;
    }
    
    // Validaciones generales
    if (analysis.lineCount > 1000) {
      validation.warnings.push('El script es muy largo (>1000 líneas). Considera dividirlo en módulos más pequeños');
    }
    
  } catch (error: any) {
    validation.isValid = false;
    validation.errors.push(`Error al analizar el script: ${error.message}`);
  }
  
  return validation;
};

// ===== MODIFICADORES =====

/**
 * Modifica variables en un script existente
 */
const _modifyScriptVariables = async (
  filePath: string, 
  variables: Record<string, string>, 
  options: ScriptModifyOptions = {}
): Promise<string> => {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const scriptType = _detectScriptType(filePath);
  
  // Crear backup si se solicita
  if (options.backup) {
    const backupPath = `${filePath}${options.backupSuffix || '.bak'}`;
    await fs.writeFile(backupPath, content, 'utf8');
  }
  
  const modifiedLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    // Buscar y reemplazar variables según el tipo de script
    switch (scriptType) {
      case 'bash':
      case 'sh':
        const bashMatch = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (bashMatch && variables.hasOwnProperty(bashMatch[1])) {
          const newValue = _escapeValue(variables[bashMatch[1]], scriptType);
          return line.replace(bashMatch[0], `${bashMatch[1]}="${newValue}"`);
        }
        break;
        
      case 'bat':
        const batMatch = trimmedLine.match(/^set\s+["']?([^=]+)=(.+)["']?$/i);
        if (batMatch && variables.hasOwnProperty(batMatch[1])) {
          const newValue = _escapeValue(variables[batMatch[1]], scriptType);
          return line.replace(batMatch[0], `set "${batMatch[1]}=${newValue}"`);
        }
        break;
        
      case 'properties':
        const propMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (propMatch && variables.hasOwnProperty(propMatch[1].trim())) {
          const newValue = _escapeValue(variables[propMatch[1].trim()], scriptType);
          return line.replace(propMatch[0], `${propMatch[1].trim()}=${newValue}`);
        }
        break;
        
      case 'ps1':
        const ps1Match = trimmedLine.match(/^\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (ps1Match && variables.hasOwnProperty(ps1Match[1])) {
          const newValue = _escapeValue(variables[ps1Match[1]], scriptType);
          return line.replace(ps1Match[0], `$${ps1Match[1]} = "${newValue}"`);
        }
        break;
    }
    
    return line;
  });
  
  const newContent = modifiedLines.join('\n');
  await fs.writeFile(filePath, newContent, 'utf8');
  
  return filePath;
};

// ===== API PÚBLICA =====

/**
 * Conjunto de utilidades para manejar scripts de inicio de forma segura
 */
export const ScriptUtils = {
  /** Genera un script de shell (bash/sh) */
  generateShellScript: asyncHandler(_generateShellScript),
  
  /** Genera un script de Windows (bat) */
  generateBatchScript: asyncHandler(_generateBatchScript),
  
  /** Genera un archivo de propiedades */
  generatePropertiesFile: asyncHandler(_generatePropertiesFile),
  
  /** Genera un script de PowerShell */
  generatePowerShellScript: asyncHandler(_generatePowerShellScript),
  
  /** Analiza un script existente */
  analyzeScript: asyncHandler(_analyzeScript),
  
  /** Valida un script */
  validateScript: asyncHandler(_validateScript),
  
  /** Modifica variables en un script existente */
  modifyScriptVariables: asyncHandler(_modifyScriptVariables),
  
  /** Detecta el tipo de script */
  detectScriptType: _detectScriptType,
  
  /** Escapa valores para diferentes tipos de script */
  escapeValue: _escapeValue
};

/**
 * Utilidad de alto nivel para crear scripts según la plataforma actual
 */
export const PlatformScriptUtils = {
  /**
   * Crea un script de inicio apropiado para la plataforma actual
   */
  createStartupScript: asyncHandler(async (
    config: {
      name: string;
      javaPath?: string;
      jarFile: string;
      jvmArgs?: string[];
      workingDirectory?: string;
      description?: string;
    }
  ): Promise<{ scriptPath: string; scriptType: ScriptType }> => {
    const platformInfo = getPlatformInfo();
    const scriptType: ScriptType = platformInfo.isWindows ? 'bat' : 'bash';
    const scriptExtension = platformInfo.isWindows ? '.bat' : '.sh';
    const scriptPath = path.join(config.workingDirectory || process.cwd(), `${config.name}${scriptExtension}`);
    
    const javaCmd = config.javaPath ? `"${config.javaPath}"` : 'java';
    const jvmArgsStr = config.jvmArgs ? config.jvmArgs.join(' ') : '-Xms1G -Xmx2G';
    const jarCmd = `${javaCmd} ${jvmArgsStr} -jar "${config.jarFile}" nogui`;
    
    if (platformInfo.isWindows) {
      const batchConfig: BatchScriptConfig = {
        name: config.name,
        description: config.description,
        commands: [jarCmd],
        workingDirectory: config.workingDirectory,
        echoOff: true,
        pauseAtEnd: true
      };
      
      const result = await ScriptUtils.generateBatchScript(batchConfig);
      if (result.success) {
        await fs.writeFile(scriptPath, result.data, 'utf8');
      }
    } else {
      const shellConfig: ShellScriptConfig = {
        name: config.name,
        description: config.description,
        commands: [jarCmd],
        workingDirectory: config.workingDirectory,
        shebang: '#!/bin/bash',
        permissions: '755'
      };
      
      const result = await ScriptUtils.generateShellScript(shellConfig, 'bash');
      if (result.success) {
        await fs.writeFile(scriptPath, result.data, 'utf8');
        // Establecer permisos de ejecución en sistemas Unix
        try {
          await fs.chmod(scriptPath, '755');
        } catch (error:any) {
          console.warn(`No se pudieron establecer permisos para ${scriptPath}:`, error.message);
        }
      }
    }
    
    return { scriptPath, scriptType };
  })
};