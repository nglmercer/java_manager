# API de Gestión de Extensiones (Plugins y Mods)

Este documento describe cómo usar la nueva API de gestión de extensiones y cómo adaptar el código del cliente para trabajar con los endpoints actualizados.

## Rutas Disponibles

### 1. Listar Extensiones
**Endpoint:** `GET /extensions/:type/:serverName`

- **type**: `plugins` o `mods`
- **serverName**: Nombre del servidor

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "name": "WorldEdit",
      "filename": "WorldEdit.jar",
      "enabled": true,
      "size": 0,
      "type": "plugin"
    },
    {
      "name": "EssentialsX",
      "filename": "EssentialsX.jar.disabled",
      "enabled": false,
      "size": 0,
      "type": "plugin"
    }
  ]
}
```

### 2. Operaciones en Extensiones
**Endpoint:** `GET /extensions/:type/:serverName/:itemName/:operation`

- **type**: `plugins` o `mods`
- **serverName**: Nombre del servidor
- **itemName**: Nombre del plugin/mod (sin extensión .jar)
- **operation**: `enable`, `disable`, o `delete`

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "message": "plugin habilitado exitosamente"
}
```

### 3. Subir Archivos
**Endpoint:** `POST /extensions/upload/:type/:serverName`

- **type**: `plugins` o `mods`
- **serverName**: Nombre del servidor
- **Body**: FormData con archivos .jar

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "message": "Archivos procesados",
  "data": {
    "results": [
      {
        "filename": "plugin.jar",
        "success": true,
        "error": null
      }
    ]
  }
}
```

### 4. Descargar desde URL
**Endpoint:** `POST /extensions/download-file`

**Body:**
```json
{
  "server": "mi-servidor",
  "url": "https://example.com/plugin.jar",
  "path": "plugins"
}
```

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "message": "Archivo descargado exitosamente",
  "data": {
    "filename": "plugin.jar",
    "path": "mi-servidor/plugins/plugin.jar",
    "size": 1024000
  }
}
```

## Adaptación del Código del Cliente

### Cambios Necesarios en PluginsApi

El código actual del cliente necesita las siguientes modificaciones:

#### 1. Actualizar URLs de los métodos

**Antes:**
```typescript
async getPlugins(serverName: string): Promise<ApiResponse<Plugin[]>> {
  return this.get<ApiResponse<Plugin[]>>(`/plugins/${serverName}`);
}
```

**Después:**
```typescript
async getPlugins(serverName: string): Promise<ApiResponse<Plugin[]>> {
  return this.get<ApiResponse<Plugin[]>>(`/plugins/${serverName}`);
}
```

#### 2. Corregir URLs de operaciones

**Antes:**
```typescript
async pluginToggle(serverName: string, itemName: string, operation: PluginOperation): Promise<ApiResponse> {
  return this.get<ApiResponse>(`/plugin/${serverName}/${itemName}/${operation}`);
}
```

**Después:**
```typescript
async pluginToggle(serverName: string, itemName: string, operation: PluginOperation): Promise<ApiResponse> {
  return this.get<ApiResponse>(`/plugins/${serverName}/${itemName}/${operation}`);
}
```

**Antes:**
```typescript
async ModToggle(serverName: string, itemName: string, operation: ModOperation): Promise<ApiResponse> {
  return this.get<ApiResponse>(`/mod/${serverName}/${itemName}/${operation}`);
}
```

**Después:**
```typescript
async ModToggle(serverName: string, itemName: string, operation: ModOperation): Promise<ApiResponse> {
  return this.get<ApiResponse>(`/mods/${serverName}/${itemName}/${operation}`);
}
```

#### 3. Agregar método para subir archivos

```typescript
/**
 * Subir archivos .jar al servidor
 * @param serverName - Nombre del servidor
 * @param files - Archivos a subir
 * @param type - Tipo de extensión ('plugins' o 'mods')
 * @returns Promise con la respuesta de la API
 */
async uploadFiles(serverName: string, files: File[], type: 'plugins' | 'mods'): Promise<ApiResponse> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  return this.post<ApiResponse>(`/upload/${type}/${serverName}`, formData);
}
```

### Código Completo Actualizado

```typescript
import BaseApi, { PrefixedApi } from '../commons/BaseApi';
import type { ApiResponse } from '../types/api.types.ts';
import type {
  Plugin,
  Mod,
  PluginOperation,
  ModOperation,
  DownloadModPluginRequest
} from '../types/server.types';
import apiConfig from '../config/apiConfig';

/**
 * API para gestión de plugins y mods
 */
class PluginsApi extends PrefixedApi {
  constructor(config: typeof apiConfig) {
    super(config, '/extensions');
  }

  /**
   * Obtener lista de plugins de un servidor
   * @param serverName - Nombre del servidor
   * @returns Promise con la lista de plugins
   */
  async getPlugins(serverName: string): Promise<ApiResponse<Plugin[]>> {
    return this.get<ApiResponse<Plugin[]>>(`/plugins/${serverName}`);
  }

  /**
   * Obtener lista de mods de un servidor
   * @param serverName - Nombre del servidor
   * @returns Promise con la lista de mods
   */
  async getMods(serverName: string): Promise<ApiResponse<Mod[]>> {
    return this.get<ApiResponse<Mod[]>>(`/mods/${serverName}`);
  }

  /**
   * Realizar operación en un plugin
   * @param serverName - Nombre del servidor
   * @param itemName - Nombre del plugin
   * @param operation - Operación a realizar
   * @returns Promise con la respuesta de la API
   */
  async pluginToggle(serverName: string, itemName: string, operation: PluginOperation): Promise<ApiResponse> {
    const validOperations: PluginOperation[] = ['enable', 'disable', 'delete'];
    
    if (!validOperations.includes(operation)) {
      throw new Error(`Invalid operation: ${operation}. Valid operations are: ${validOperations.join(', ')}`);
    }
    
    return this.get<ApiResponse>(`/plugins/${serverName}/${itemName}/${operation}`);
  }

  /**
   * Realizar operación en un mod
   * @param serverName - Nombre del servidor
   * @param itemName - Nombre del mod
   * @param operation - Operación a realizar
   * @returns Promise con la respuesta de la API
   */
  async ModToggle(serverName: string, itemName: string, operation: ModOperation): Promise<ApiResponse> {
    const validOperations: ModOperation[] = ['enable', 'disable', 'delete'];
    
    if (!validOperations.includes(operation)) {
      throw new Error(`Invalid operation: ${operation}. Valid operations are: ${validOperations.join(', ')}`);
    }
    
    return this.get<ApiResponse>(`/mods/${serverName}/${itemName}/${operation}`);
  }

  /**
   * Subir archivos .jar al servidor
   * @param serverName - Nombre del servidor
   * @param files - Archivos a subir
   * @param type - Tipo de extensión ('plugins' o 'mods')
   * @returns Promise con la respuesta de la API
   */
  async uploadFiles(serverName: string, files: File[], type: 'plugins' | 'mods'): Promise<ApiResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    return this.post<ApiResponse>(`/upload/${type}/${serverName}`, formData);
  }

  /**
   * Descargar mod o plugin desde URL
   * @param serverName - Nombre del servidor
   * @param url - URL del archivo a descargar
   * @param type - Tipo de descarga ('mods' o 'plugins')
   * @returns Promise con la respuesta de la API
   */
  async DownloadModorPlugin(serverName: string, url: string, type: 'mods' | 'plugins'): Promise<ApiResponse> {
    const downloadData: DownloadModPluginRequest = {
      server: serverName,
      url: url,
      path: type
    };
    
    return this.post<ApiResponse>('/download-file', downloadData);
  }
}

export default PluginsApi;
```

## Ejemplos de Uso

### Listar plugins
```typescript
const pluginsApi = new PluginsApi(apiConfig);
const plugins = await pluginsApi.getPlugins('mi-servidor');
console.log(plugins.data);
```

### Habilitar un plugin
```typescript
const result = await pluginsApi.pluginToggle('mi-servidor', 'WorldEdit', 'enable');
console.log(result.message);
```

### Subir archivos
```typescript
const files = [/* archivos seleccionados */];
const result = await pluginsApi.uploadFiles('mi-servidor', files, 'plugins');
console.log(result.data.results);
```

### Descargar desde URL
```typescript
const result = await pluginsApi.DownloadModorPlugin(
  'mi-servidor',
  'https://example.com/plugin.jar',
  'plugins'
);
console.log(result.data);
```

## Notas Importantes

1. **Validación de archivos**: Solo se permiten archivos .jar
2. **Seguridad**: Todos los nombres de archivos y rutas son validados
3. **Estados**: Los archivos deshabilitados tienen extensión `.disabled`
4. **Errores**: Todas las respuestas incluyen un campo `success` para verificar el estado
5. **Tipos**: Asegúrate de usar `'plugins'` o `'mods'` exactamente como se especifica

## Migración desde la API Anterior

1. Cambiar `/plugin/` por `/plugins/` en las URLs
2. Cambiar `/mod/` por `/mods/` en las URLs
3. Agregar el nuevo método `uploadFiles` si necesitas subir archivos
4. Verificar que el campo `path` en `DownloadModorPlugin` use `'plugins'` o `'mods'`