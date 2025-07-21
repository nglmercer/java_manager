import { env } from './env.js';
import { JavaInfoService,type JavaRelease } from '../services/java-info.service.js';
import { taskManager, defaultPaths } from '../services/taskInstance.js';
import path from 'path';
async function main() {
  const tempFile = path.join(defaultPaths.downloadPath, 'OpenJDK8U-jdk_x64_windows_hotspot_8u452b09.zip');
  try {
/*     const javaVersion = 8; // Ejemplo de versión, puedes cambiarlo
    const javaInfo = await JavaInfoService.getJavaInfo(javaVersion);
    const alljavaVersions = await JavaInfoService.getInstallableVersions();
    const FindVersion = await JavaInfoService.filter(alljavaVersions.data.releases, javaVersion);
    if (!FindVersion.data)return;
    const downloadJava = await JavaInfoService.downloadJavaRelease(FindVersion.data);
    const TaskInfo = await taskManager.getTask(downloadJava.data);
    console.log("TaskInfo:", TaskInfo,downloadJava); */
    const decompressJava = await taskManager.unpack(tempFile);
    // downloadJava {success: boolean, data: string} data:TaskId | string
    //console.log('Información de Java:', javaInfo);
    //console.log('Versiones de Java disponibles:', alljavaVersions);
    console.log('decompressJava:',decompressJava)
    //  console.log('Descarga de Java:', downloadJava);
  } catch (error) {
    console.error('Error al obtener la información de Java:', error);
  }
}
main().catch(console.error);