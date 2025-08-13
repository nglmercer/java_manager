# Script Utils Library

## 📋 Descripción

Librería completa de utilidades para manejar, modificar, obtener y generar archivos de inicio de scripts como `.bash`, `.bat`, `.properties`, `.sh` y `.ps1` de forma segura usando TypeScript.

## ✨ Características

- **Generación multiplataforma**: Crea scripts apropiados para Windows, Linux, macOS y Android (Termux)
- **Análisis avanzado**: Analiza scripts existentes con métricas de complejidad y calidad
- **Validación de seguridad**: Detecta comandos potencialmente peligrosos y vulnerabilidades
- **Manejo de tipos**: Tipos TypeScript completos para todas las configuraciones
- **Templates predefinidos**: Plantillas listas para usar para casos comunes
- **Sistema de eventos**: Monitoreo y logging de operaciones
- **Modificación segura**: Edición de scripts con respaldos automáticos

## 🚀 Instalación y Uso

### Importación básica

```typescript
import { ScriptUtils, PlatformScriptUtils, AdvancedScriptUtils } from './utils';
```

### Importación completa

```typescript
import ScriptLibrary from './utils';
// o
import * as ScriptLibrary from './utils';
```

## 📖 Guía de Uso

### 1. Crear Scripts Básicos

#### Script de inicio multiplataforma

```typescript
import { PlatformScriptUtils } from './utils';

const config = {
  name: 'minecraft-server',
  javaPath: 'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe',
  jarFile: 'server.jar',
  jvmArgs: ['-Xms2G', '-Xmx4G'],
  workingDirectory: './servers/minecraft',
  description: 'Script de inicio para servidor Minecraft'
};

const result = await PlatformScriptUtils.createStartupScript(config);
if (result.success) {
  console.log(`Script creado: ${result.data.scriptPath}`);
}
```

#### Script de shell personalizado

```typescript
import { ScriptUtils, ShellScriptConfig } from './utils';

const config: ShellScriptConfig = {
  name: 'backup-script',
  shebang: '#!/bin/bash',
  commands: [
    'echo "Iniciando respaldo..."',
    'tar -czf backup.tar.gz /path/to/data',
    'echo "Respaldo completado"'
  ],
  variables: {
    'BACKUP_DIR': '/backups',
    'DATE': '$(date +%Y%m%d)'
  },
  workingDirectory: '/opt/scripts'
};

const result = await ScriptUtils.generateShellScript(config, 'bash');
```

#### Archivo de propiedades

```typescript
import { ScriptUtils, PropertiesConfig } from './utils';

const config: PropertiesConfig = {
  name: 'server-config',
  properties: {
    'server-port': 25565,
    'max-players': 20,
    'motd': 'Mi Servidor',
    'difficulty': 'normal'
  },
  comments: {
    'server-port': 'Puerto del servidor',
    'max-players': 'Número máximo de jugadores'
  },
  sections: {
    'Configuración de red': {
      'enable-query': true,
      'query.port': 25565
    }
  }
};

const result = await ScriptUtils.generatePropertiesFile(config);
```

### 2. Scripts Avanzados

#### Script con manejo de errores y logging

```typescript
import { AdvancedScriptUtils, AdvancedShellScriptConfig } from './utils';

const config: AdvancedShellScriptConfig = {
  name: 'advanced-server',
  description: 'Servidor con logging y verificaciones',
  version: '1.0.0',
  strictMode: true,
  
  variables: [
    {
      name: 'SERVER_DIR',
      value: '/opt/server',
      type: 'path',
      description: 'Directorio del servidor',
      required: true
    }
  ],
  
  dependencies: [
    {
      name: 'java',
      required: true,
      description: 'Java Runtime Environment',
      checkCommand: 'java -version'
    }
  ],
  
  commands: [
    {
      command: 'java -jar server.jar',
      description: 'Ejecutar servidor',
      timeout: 300000,
      continueOnError: false
    }
  ],
  
  logging: {
    enabled: true,
    level: 'info',
    outputFile: '/var/log/server.log',
    includeTimestamp: true
  },
  
  security: {
    allowedCommands: ['java', 'echo', 'cd'],
    maxExecutionTime: 600000
  }
};

const result = await AdvancedScriptUtils.generateAdvancedShellScript(config);
```

### 3. Análisis y Validación

#### Análisis básico

```typescript
import { ScriptUtils } from './utils';

const analysis = await ScriptUtils.analyzeScript('./script.sh');
if (analysis.success) {
  console.log(`Tipo: ${analysis.data.type}`);
  console.log(`Variables: ${Object.keys(analysis.data.variables).length}`);
  console.log(`Comandos: ${analysis.data.commands.length}`);
}
```

#### Análisis detallado

```typescript
import { AdvancedScriptUtils } from './utils';

const analysis = await AdvancedScriptUtils.performDetailedAnalysis('./script.sh');
if (analysis.success) {
  const data = analysis.data;
  console.log(`Complejidad: ${data.complexity.cyclomaticComplexity}`);
  console.log(`Comentarios: ${data.complexity.commentRatio.toFixed(1)}%`);
  console.log(`Riesgos: ${data.securityAnalysis.potentialRisks.length}`);
}
```

#### Validación avanzada

```typescript
import { AdvancedScriptUtils } from './utils';

const validation = await AdvancedScriptUtils.performAdvancedValidation('./script.sh');
if (validation.success) {
  const data = validation.data;
  console.log(`Puntuación: ${data.score}/100`);
  console.log(`Seguridad: ${data.security.score}/100`);
  console.log(`Rendimiento: ${data.performance.score}/100`);
}
```

### 4. Modificación de Scripts

```typescript
import { ScriptUtils } from './utils';

const variables = {
  'SERVER_PORT': '25566',
  'MAX_MEMORY': '4G'
};

const options = {
  backup: true,
  backupSuffix: '.bak',
  preserveComments: true
};

const result = await ScriptUtils.modifyScriptVariables(
  './script.sh',
  variables,
  options
);
```

### 5. Templates Predefinidos

```typescript
import { ScriptTemplates } from './utils';

// Listar templates disponibles
Object.entries(ScriptTemplates).forEach(([key, template]) => {
  console.log(`${key}: ${template.description}`);
});

// Usar template
const template = ScriptTemplates.javaServer;
let content = template.content;

// Reemplazar variables
const variables = {
  'JAVA_PATH': '/usr/bin/java',
  'JAR_FILE': 'server.jar',
  'JVM_ARGS': '-Xms2G -Xmx4G'
};

Object.entries(variables).forEach(([key, value]) => {
  content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
});
```

### 6. Sistema de Eventos

```typescript
import { ScriptEventManager } from './utils';

// Configurar listeners
ScriptEventManager.addEventListener('created', (event) => {
  console.log(`Script creado: ${event.scriptPath}`);
});

ScriptEventManager.addEventListener('validated', (event) => {
  console.log(`Script validado: ${event.scriptPath}`);
});

// Emitir eventos
ScriptEventManager.emitEvent({
  type: 'created',
  timestamp: new Date(),
  scriptPath: '/path/to/script.sh'
});
```

## 🔧 API Reference

### ScriptUtils (Básico)

- `generateShellScript(config, scriptType)` - Genera script de shell
- `generateBatchScript(config)` - Genera script de Windows
- `generatePropertiesFile(config)` - Genera archivo de propiedades
- `generatePowerShellScript(config)` - Genera script de PowerShell
- `analyzeScript(filePath)` - Analiza script existente
- `validateScript(filePath)` - Valida script
- `modifyScriptVariables(filePath, variables, options)` - Modifica variables

### AdvancedScriptUtils (Avanzado)

- `generateAdvancedShellScript(config, options)` - Script avanzado de shell
- `generateAdvancedBatchScript(config, options)` - Script avanzado de Windows
- `performDetailedAnalysis(filePath)` - Análisis detallado
- `performAdvancedValidation(filePath)` - Validación avanzada
- `checkDependencies(dependencies)` - Verificar dependencias
- `validateEnvironmentVariables(variables)` - Validar variables

### PlatformScriptUtils (Multiplataforma)

- `createStartupScript(config)` - Crea script apropiado para la plataforma

## 📊 Tipos de Datos

### Configuraciones Básicas

```typescript
interface ShellScriptConfig {
  name: string;
  shebang?: string;
  commands: string[];
  variables?: Record<string, string>;
  workingDirectory?: string;
  permissions?: string;
}

interface BatchScriptConfig {
  name: string;
  commands: string[];
  variables?: Record<string, string>;
  workingDirectory?: string;
  echoOff?: boolean;
  pauseAtEnd?: boolean;
}

interface PropertiesConfig {
  name: string;
  properties: Record<string, string | number | boolean>;
  comments?: Record<string, string>;
  sections?: Record<string, Record<string, any>>;
}
```

### Configuraciones Avanzadas

```typescript
interface AdvancedShellScriptConfig {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  variables?: EnvironmentVariable[];
  commands: ScriptCommand[];
  dependencies?: ScriptDependency[];
  logging?: ScriptLogging;
  security?: ScriptSecurity;
  strictMode?: boolean;
  trapSignals?: string[];
}

interface EnvironmentVariable {
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'path' | 'url';
  description?: string;
  required?: boolean;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    allowedValues?: string[];
  };
}
```

## 🛡️ Seguridad

La librería incluye múltiples capas de seguridad:

- **Validación de comandos**: Detecta comandos potencialmente peligrosos
- **Escape de caracteres**: Escapa automáticamente caracteres especiales
- **Validación de rutas**: Verifica que las rutas sean válidas y seguras
- **Límites de ejecución**: Controla tiempo máximo de ejecución
- **Lista blanca/negra**: Permite/bloquea comandos específicos

## 📝 Ejemplos Completos

Para ver ejemplos completos y funcionales:

```typescript
import { runAllExamples } from './utils';

// Ejecuta todos los ejemplos
await runAllExamples();
```

Esto creará varios archivos de ejemplo que puedes examinar y modificar.

## 🔍 Debugging y Logging

La librería incluye logging integrado:

```typescript
const config = {
  logging: {
    enabled: true,
    level: 'debug',
    outputFile: './script.log',
    includeTimestamp: true
  }
};
```

## 🚨 Comandos Peligrosos Detectados

La librería detecta automáticamente estos comandos:

- `rm -rf` / `del /s`
- `format` / `fdisk`
- `eval` / `exec`
- `sudo rm` / `sudo dd`
- URLs HTTP no seguras
- Ejecución de código dinámico

## 📈 Métricas de Calidad

El análisis avanzado proporciona:

- **Complejidad ciclomática**: Mide la complejidad del código
- **Ratio de comentarios**: Porcentaje de líneas comentadas
- **Puntuación de seguridad**: Evaluación de riesgos (0-100)
- **Puntuación de rendimiento**: Optimización del código (0-100)
- **Puntuación de mantenibilidad**: Facilidad de mantenimiento (0-100)

## 🤝 Contribución

Para contribuir al proyecto:

1. Agrega nuevos tipos de script en `script-types.ts`
2. Implementa generadores en `script-utils.ts` o `advanced-script-utils.ts`
3. Agrega templates en `ScriptTemplates`
4. Incluye ejemplos en `script-examples.ts`
5. Actualiza la documentación

## 📄 Licencia

Este proyecto es parte del Java Manager y sigue la misma licencia del proyecto principal.