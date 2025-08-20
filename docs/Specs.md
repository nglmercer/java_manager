### 1. Diseño de la API REST (Endpoints, Métodos y Objetos)

El objetivo es tener una API clara, predecible y que siga las convenciones REST. Usaremos el prefijo `/api/v1` para versionar la API desde el principio.

#### **Recurso Principal: `/java`**

Este recurso representará las instalaciones de Java en el sistema.

#### **Objetos (Modelos de Datos)**

Estos son los objetos JSON que la API recibirá o devolverá.

**`JavaVersion`**: Representa una versión de Java encontrada en la carpeta de binarios.
```json
{
  "id": "openjdk_17.0.5_x64", // ID único y amigable para la URL
  "version": "17.0.5",
  "vendor": "OpenJDK", // Ej: OpenJDK, Oracle, Adoptium, Amazon Corretto
  "architecture": "x64", // o aarch64
  "path": "/usr/lib/jvm/java-17-openjdk-amd64/bin/java", // Ruta completa al ejecutable
  "homePath": "/usr/lib/jvm/java-17-openjdk-amd64", // Ruta al JAVA_HOME, muy útil
  "lastScanned": "2023-10-27T10:30:00Z" // Fecha de cuándo fue detectado por última vez
}
```

**`SystemJavaInfo`**: Representa la versión de Java activa en el `PATH` del sistema.
```json
{
  "isInstalled": true,
  "version": "11.0.20",
  "vendor": "Amazon Corretto",
  "path": "/usr/bin/java", // La ruta que resuelve el sistema por defecto
  "rawOutput": "openjdk 11.0.20 2023-07-18 LTS..." // Salida completa de 'java -version'
}
```
*Si `isInstalled` es `false`, los otros campos pueden ser `null`.*

**`ErrorResponse`**: Un formato estándar para errores.
```json
{
  "timestamp": "2023-10-27T10:35:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "No se encontró una versión de Java con el ID 'oracle-8'.",
  "path": "/api/v1/java/versions/oracle-8"
}
```

---

#### **Endpoints (Métodos y Parámetros)**

**1. Comprobar la versión de Java del sistema**
   - **Propósito**: Verifica qué versión de Java se ejecuta al llamar `java -version` en la terminal.
   - **Método**: `GET`
   - **Endpoint**: `/api/v1/java/system`
   - **Parámetros**: Ninguno.
   - **Respuesta Exitosa (200 OK)**: Un objeto `SystemJavaInfo`.
     ```json
     {
       "isInstalled": true,
       "version": "11.0.20",
       // ...resto de los campos
     }
     ```
     O si no está instalado:
     ```json
     {
       "isInstalled": false,
       "version": null,
       // ...
     }
     ```
   - **Respuesta de Error (500 Internal Server Error)**: Si el comando `java -version` falla por una razón inesperada.

**2. Listar todas las versiones de Java disponibles en la carpeta gestionada**
   - **Propósito**: Escanea el directorio configurado y devuelve una lista de todas las versiones de Java válidas que encuentra.
   - **Método**: `GET`
   - **Endpoint**: `/api/v1/java/versions`
   - **Parámetros (Query - Opcionales)**:
     - `vendor` (string): Filtra por proveedor. Ej: `/api/v1/java/versions?vendor=OpenJDK`
     - `architecture` (string): Filtra por arquitectura. Ej: `/api/v1/java/versions?architecture=x64`
   - **Respuesta Exitosa (200 OK)**: Un array de objetos `JavaVersion`.
     ```json
     [
       { "id": "openjdk_17.0.5_x64", "version": "17.0.5", ... },
       { "id": "corretto_11.0.20_x64", "version": "11.0.20", ... }
     ]
     ```
   - **Respuesta de Error (404 Not Found)**: Si el directorio de binarios configurado no existe.

**3. Obtener detalles de una versión específica**
   - **Propósito**: Devuelve la información completa de una versión de Java específica por su ID.
   - **Método**: `GET`
   - **Endpoint**: `/api/v1/java/versions/{id}`
   - **Parámetros (Path)**:
     - `id` (string): El ID único de la versión de Java. Ej: `openjdk_17.0.5_x64`.
   - **Respuesta Exitosa (200 OK)**: Un único objeto `JavaVersion`.
     ```json
     {
       "id": "openjdk_17.0.5_x64",
       "version": "17.0.5",
       // ...resto de los campos
     }
     ```
   - **Respuesta de Error (404 Not Found)**: Si no se encuentra ninguna versión con ese `id`.

*(Futuro) Posibles endpoints para ampliar la funcionalidad:*
- `POST /api/v1/java/actions/scan`: Para forzar un re-escaneo de la carpeta de binarios.
- `PUT /api/v1/java/system`: Para intentar cambiar la versión de Java por defecto del sistema (requiere privilegios elevados y es complejo).
- `DELETE /api/v1/java/versions/{id}`: Para eliminar una versión de Java de la carpeta.

---

### 2. Estructura de Carpetas del Proyecto

Esta estructura es agnóstica al lenguaje (funciona bien para Node.js/Express, Python/Flask/FastAPI, Go, o Java/Spring Boot) y sigue el principio de separación de responsabilidades.

```
mi-java-api/
├── .env                  # Variables de entorno (puerto, ruta a la carpeta de Java)
├── .gitignore            # Archivos a ignorar por Git
├── Dockerfile            # (Opcional) Para containerizar la aplicación
├── package.json          # o requirements.txt, pom.xml, etc.
├── README.md             # Documentación del proyecto
│
└── src/                  # Carpeta principal del código fuente
    ├── api/              # Capa de la API (también llamada controllers o routes)
    │   ├── java.routes.js        # Define los endpoints (/java/system, /java/versions)
    │   └── middleware/           # Middlewares (ej: para logging, manejo de errores)
    │       ├── errorHandler.js
    │       └── logger.js
    │
    ├── config/           # Configuración de la aplicación
    │   └── index.js              # Carga y exporta la configuración desde .env
    │
    ├── models/           # (Opcional, pero recomendado) Definición de los objetos/esquemas
    │   ├── JavaVersion.js
    │   └── SystemJavaInfo.js
    │
    ├── services/         # La lógica de negocio principal (el "cerebro")
    │   └── java.service.js       # Funciones como: findAvailableVersions(), getSystemJavaInfo()
    │
    ├── utils/            # Funciones de utilidad reutilizables
    │   ├── shell.util.js         # Wrapper para ejecutar comandos de terminal de forma segura
    │   ├── file.util.js          # Funciones para leer directorios y archivos
    │   └── parser.util.js        # Lógica para parsear la salida de 'java -version' o nombres de carpetas
    │
    └── app.js            # Punto de entrada de la aplicación: inicializa el servidor y monta las rutas
```

#### **Detalle de las Responsabilidades de cada Carpeta:**

*   **`src/config`**: Su única misión es leer variables de entorno (del archivo `.env`) y exponerlas de forma segura a la aplicación. La más importante aquí será `JAVA_BINARIES_PATH`.
    *   *Ejemplo de `.env`*:
        ```
        PORT=3000
        JAVA_BINARIES_PATH="/opt/jdks"
        # O en Windows: JAVA_BINARIES_PATH="C:\Program Files\Java"
        ```

*   **`src/utils`**: Contiene código genérico que no sabe nada de "Java".
    *   **`shell.util.js`**: Tendrá una función como `executeCommand(command)` que devuelve una promesa con la salida (stdout) y el error (stderr). Es crucial para ejecutar `java -version`.
    *   **`file.util.js`**: Tendrá `readDirectory(path)` para listar el contenido de la carpeta de binarios.
    *   **`parser.util.js`**: Aquí está la lógica "inteligente". Tendrá funciones como `parseJavaVersionOutput(string)` para extraer la versión y el vendor de la salida de un comando, o `guessVersionFromDirName(dirName)` para intentar adivinar la versión a partir del nombre de una carpeta (ej: "jdk-17.0.5").

*   **`src/services`**: Aquí se conecta todo.
    *   **`java.service.js`**:
        *   `getSystemJavaInfo()`: Llama a `utils/shell` para ejecutar `java -version`, luego a `utils/parser` para procesar la salida y finalmente construye el objeto `SystemJavaInfo`.
        *   `findAvailableVersions()`: Llama a `utils/file` para leer el `JAVA_BINARIES_PATH` de la configuración. Por cada subcarpeta, intenta ejecutar `bin/java -version` dentro de ella. Usa `utils/parser` para crear los objetos `JavaVersion`. Puede implementar un caché simple para no re-escanear en cada petición.

*   **`src/api`**: La puerta de entrada a tu aplicación.
    *   **`java.routes.js`**: Define `router.get('/system', ...)` y `router.get('/versions', ...)`.
    *   Los controladores dentro de las rutas se encargan de:
        1.  Recibir la petición HTTP.
        2.  Llamar a la función correspondiente en `java.service`.
        3.  Manejar los parámetros de la petición (como el `{id}`).
        4.  Enviar la respuesta (el JSON o un código de error) al cliente.

*   **`app.js`**: El pegamento final. Carga la configuración, inicializa el framework web (como Express), le dice que use las rutas definidas en `api/`, y arranca el servidor.

