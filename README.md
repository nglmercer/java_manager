# Java Manager API Documentation

## Descripción
API REST para la gestión de instalaciones de Java. Permite listar, descargar, instalar, buscar y eliminar versiones de Java de forma automatizada.

## Base URL
```
http://localhost:{PORT}/java
```

## Endpoints

### 1. Obtener todas las versiones disponibles
```http
GET /java/all
```

**Descripción**: Obtiene todas las versiones de Java disponibles para instalación.

**Respuesta exitosa (200)**:
```json
{
  "data": {
    "releases": [
      {
        "featureVersion": 17,
        "arch": "x64",
        "os": "linux",
        "downloadUrl": "https://...",
        "filename": "openjdk-17..."
      }
    ]
  }
}
```

**Respuesta de error (500)**:
```json
{
  "error": "error",
  "message": "Error message"
}
```

---

### 2. Buscar versión específica instalada
```http
GET /java/find/{version}
```

**Parámetros**:
- `version` (path parameter): Número de versión de Java a buscar

**Ejemplo**:
```http
GET /java/find/17
```

**Respuesta exitosa (200)**:
```json
{
  "version": 17,
  "path": "/path/to/java17",
  "folderName": "java-17-openjdk",
  "executable": "/path/to/java17/bin/java"
}
```

**Respuesta de error (404)**:
```json
{
  "error": "Java version not found"
}
```

**Respuesta de error (500)**:
```json
{
  "error": "error",
  "message": "Error message"
}
```

---

### 3. Descargar e instalar versión de Java
```http
GET /java/download/{version}
```

**Parámetros**:
- `version` (path parameter): Número de versión de Java a descargar

**Ejemplo**:
```http
GET /java/download/17
```

**Descripción**: Descarga y descomprime automáticamente la versión especificada de Java.

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Java version downloaded successfully",
  "downloadPath": "/path/to/downloaded/file",
  "extractPath": "/path/to/extracted/folder"
}
```

**Respuesta de error (404)**:
```json
{
  "error": "Java version not found or installed?",
  "data": {
    "version": 17,
    "isInstalled": true
  }
}
```

**Respuesta de error (500)**:
```json
{
  "error": "error",
  "message": "Error message"
}
```

---

### 4. Escanear instalaciones de Java
```http
GET /java/scan
```

**Descripción**: Escanea el directorio de instalaciones para detectar todas las versiones de Java instaladas.

**Respuesta exitosa (200)**:
```json
{
  "installations": [
    {
      "version": 17,
      "path": "/path/to/java17",
      "folderName": "java-17-openjdk"
    },
    {
      "version": 11,
      "path": "/path/to/java11",
      "folderName": "java-11-openjdk"
    }
  ]
}
```

**Respuesta de error (500)**:
```json
{
  "error": "error",
  "message": "Error message"
}
```

---

### 5. Eliminar versión de Java
```http
DELETE /java/delete/{version}
```

**Parámetros**:
- `version` (path parameter): Número de versión de Java a eliminar

**Ejemplo**:
```http
DELETE /java/delete/17
```

**Descripción**: Elimina completamente una versión instalada de Java del sistema.

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": "Java version deleted successfully",
  "deletedPath": "/path/to/deleted/folder"
}
```

**Respuesta de error (404)**:
```json
{
  "error": "Java version not found"
}
```

**Respuesta de error (500)**:
```json
{
  "error": "error",
  "message": "Error message"
}
```

---

## Códigos de estado HTTP

| Código | Descripción |
|--------|-------------|
| 200    | Operación exitosa |
| 404    | Recurso no encontrado |
| 500    | Error interno del servidor |

## Estructura de archivos

La API utiliza la siguiente estructura de archivos:
- **Download Path**: Directorio donde se descargan los archivos comprimidos
- **Unpack Path**: Directorio donde se extraen las instalaciones de Java

## Formato de archivo

Los archivos de Java se nombran siguiendo el patrón:
```
{featureVersion}_{arch}_{os}.zip
```

Ejemplo: `17_x64_linux.zip`

## Dependencias principales

- **Hono**: Framework web para la API REST
- **Axios**: Cliente HTTP para descargas
- **node-task-manager**: Gestión de tareas de descarga y descompresión

## Notas de implementación

1. **Descarga automática**: El endpoint `/download` descarga y descomprime automáticamente la versión solicitada
2. **Validación de duplicados**: No permite descargar versiones ya instaladas
3. **Gestión de errores**: Todos los endpoints incluyen manejo de errores consistente
4. **Logging**: Se registran operaciones y errores en la consola

## Ejemplos de uso

### Flujo típico de instalación:
1. `GET /java/all` - Ver versiones disponibles
2. `GET /java/find/17` - Verificar si ya está instalada
3. `GET /java/download/17` - Descargar e instalar si no existe
4. `GET /java/scan` - Confirmar instalación exitosa

### Gestión de instalaciones:
1. `GET /java/scan` - Ver todas las instalaciones
2. `DELETE /java/delete/17` - Eliminar versión específica

```
npm install
npm run dev
```

```
open http://localhost:3000
```
