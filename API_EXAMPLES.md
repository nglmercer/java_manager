# API de Gestión de Servidores Minecraft

Esta documentación describe las nuevas funcionalidades implementadas para el control y monitoreo de servidores Minecraft.

## Endpoints Disponibles

### 1. Obtener información de un servidor
```http
GET /mc/:server/info
```
**Ejemplo:**
```bash
curl http://localhost:3000/mc/mi-servidor/info
```

### 2. Obtener todos los servidores
```http
GET /mc/all
```
**Ejemplo:**
```bash
curl http://localhost:3000/mc/all
```

### 3. Obtener logs de un servidor
```http
GET /mc/:server/logs?lines=100
```
**Parámetros:**
- `lines` (opcional): Número de líneas de log a obtener

**Ejemplo:**
```bash
# Obtener los últimos 50 logs
curl http://localhost:3000/mc/mi-servidor/logs?lines=50

# Obtener todos los logs
curl http://localhost:3000/mc/mi-servidor/logs
```

### 4. Obtener métricas de un servidor
```http
GET /mc/:server/metrics
```
**Ejemplo:**
```bash
curl http://localhost:3000/mc/mi-servidor/metrics
```

### 5. Controlar servidores (Acciones)
```http
POST /mc/:server/:action
```

#### Acciones disponibles:

##### Iniciar servidor
```bash
curl -X POST http://localhost:3000/mc/mi-servidor/start
```

##### Detener servidor
```bash
curl -X POST http://localhost:3000/mc/mi-servidor/stop
```

##### Reiniciar servidor
```bash
curl -X POST http://localhost:3000/mc/mi-servidor/restart
```

##### Terminar servidor forzosamente
```bash
curl -X POST http://localhost:3000/mc/mi-servidor/kill
```

##### Enviar comando al servidor
```bash
curl -X POST http://localhost:3000/mc/mi-servidor/send \
  -H "Content-Type: application/json" \
  -d '{"command": "say Hola mundo!"}'
```

### 6. Limpiar logs de un servidor
```http
DELETE /mc/:server/logs
```
**Ejemplo:**
```bash
curl -X DELETE http://localhost:3000/mc/mi-servidor/logs
```

## Respuestas de la API

### Respuesta exitosa de información del servidor
```json
{
  "success": true,
  "data": {
    "id": "uuid-del-servidor",
    "name": "mi-servidor",
    "path": "/ruta/al/servidor",
    "serverType": "vanilla",
    "version": "1.20.1",
    "isValid": true,
    "worldSize": 1024000,
    "totalSize": 2048000,
    "playerCount": 20,
    "plugins": [],
    "mods": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Respuesta exitosa de logs
```json
{
  "success": true,
  "data": [
    "[2024-01-01T12:00:00.000Z] [Server thread/INFO]: Starting minecraft server version 1.20.1",
    "[2024-01-01T12:00:01.000Z] [Server thread/INFO]: Loading properties",
    "[2024-01-01T12:00:02.000Z] [Server thread/INFO]: Done (2.5s)! For help, type \"help\""
  ]
}
```

### Respuesta exitosa de métricas
```json
{
  "success": true,
  "data": {
    "serverName": "mi-servidor",
    "players": 5,
    "tps": 20.0,
    "memoryUsage": 512,
    "cpuUsage": 25.5,
    "uptime": 3600,
    "status": "running"
  }
}
```

### Respuesta exitosa de acción
```json
{
  "success": true,
  "message": "Servidor iniciado",
  "action": "start",
  "server": "mi-servidor"
}
```

### Respuesta de error
```json
{
  "success": false,
  "error": "Servidor no encontrado"
}
```

## Estados del servidor

- `stopped`: El servidor está detenido
- `starting`: El servidor se está iniciando
- `running`: El servidor está ejecutándose
- `stopping`: El servidor se está deteniendo

## Comandos útiles para servidores Minecraft

### Comandos básicos
```bash
# Listar jugadores conectados
curl -X POST http://localhost:3000/mc/mi-servidor/send \
  -H "Content-Type: application/json" \
  -d '{"command": "list"}'

# Enviar mensaje a todos los jugadores
curl -X POST http://localhost:3000/mc/mi-servidor/send \
  -H "Content-Type: application/json" \
  -d '{"command": "say ¡Hola a todos!"}'

# Cambiar hora del juego
curl -X POST http://localhost:3000/mc/mi-servidor/send \
  -H "Content-Type: application/json" \
  -d '{"command": "time set day"}'

# Cambiar clima
curl -X POST http://localhost:3000/mc/mi-servidor/send \
  -H "Content-Type: application/json" \
  -d '{"command": "weather clear"}'
```

### Comandos administrativos
```bash
# Guardar el mundo
curl -X POST http://localhost:3000/mc/mi-servidor/send \
  -H "Content-Type: application/json" \
  -d '{"command": "save-all"}'

# Kickear un jugador
curl -X POST http://localhost:3000/mc/mi-servidor/send \
  -H "Content-Type: application/json" \
  -d '{"command": "kick jugador Razón del kick"}'

# Banear un jugador
curl -X POST http://localhost:3000/mc/mi-servidor/send \
  -H "Content-Type: application/json" \
  -d '{"command": "ban jugador Razón del ban"}'
```

## Notas importantes

1. **Logs en memoria**: Los logs se mantienen en memoria con un límite de 1000 líneas por servidor.
2. **Reinicio automático**: El comando `restart` detiene el servidor y lo inicia automáticamente después de 2 segundos.
3. **Validación**: Solo se pueden controlar servidores que hayan sido detectados y validados por el sistema.
4. **Inicialización**: El sistema debe estar inicializado antes de poder usar las funciones de control.