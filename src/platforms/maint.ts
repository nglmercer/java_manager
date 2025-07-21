import { env } from './env.js';
import { JavaInfoService,type JavaRelease } from '../services/java-info.service.js';
async function main() {
  try {
    const javaVersion = '17'; // Ejemplo de versión, puedes cambiarlo
    const javaInfo = await JavaInfoService.getJavaInfo(javaVersion);
    const alljavaVersions = await JavaInfoService.getInstallableVersions();
    const FindVersion = await JavaInfoService.filter(alljavaVersions.data.releases, 8);
    if (!FindVersion.data)return;
    const downloadJava = await JavaInfoService.downloadJavaRelease(FindVersion.data);
    const decompressJava = await JavaInfoService.decompressJavaRelease(FindVersion.data)
    // downloadJava {success: boolean, data: string} data:TaskId | string
    console.log('Información de Java:', javaInfo);
      console.log('Versiones de Java disponibles:', alljavaVersions);
      console.log('Descarga de Java:', downloadJava);
  } catch (error) {
    console.error('Error al obtener la información de Java:', error);
  }
}
main().catch(console.error);