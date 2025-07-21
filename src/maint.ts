import { env } from './platforms/env.js';
import { JavaInfoService,type JavaRelease } from './services/java-info.service.js';
import { taskManager, defaultPaths } from './services/taskInstance.js';
import { scanJavaInstallations,findJavaVersion } from './services/java-installations.js';
import path from 'path';
const ARCHFILE_NAME = (release: JavaRelease): string => {
  const { featureVersion, arch, os } = release;
  return `${featureVersion}_${arch}_${os}.zip`;
}
async function main() {
  // destination better use javaVersion_arch ✔ || FILENAME❌ OpenJDK8U-jdk_x64_windows_hotspot_8u452b09.zip
  // taskId = await taskManager.download(url) || await JavaInfoService.downloadJavaRelease(javaVersion).data;
  // GET DOWNLOAD_FILE_NAME taskManager.getTask(taskId)
  // tempFile path.join(defaultPaths.downloadPath,DOWNLOAD_FILE_NAME)
  // FindVersion.data = {featureVersion, arch, os, ...strings }
  // const UNPACK_PATH = path.join(defaultPaths.unpackPath, (featureVersion + '_' + arch + '_' + os));
  // taskManager.unpack(tempFile,{destination: UNPACK_PATH})
  //const tempFile = path.join(defaultPaths.downloadPath, 'OpenJDK8U-jdk_x64_windows_hotspot_8u452b09.zip');
  try {
    const javaVersion = 8; // Ejemplo de versión, puedes cambiarlo
    const alljavaVersions = await JavaInfoService.getInstallableVersions();
    const FindVersion = await JavaInfoService.filter(alljavaVersions.data.releases, javaVersion);
    if (!FindVersion.data)return;
    const getFilename = ARCHFILE_NAME(FindVersion.data);
    const downloadJava = await JavaInfoService.downloadJavaRelease(FindVersion.data,getFilename,async(data)=> {
      const decompressJava = await taskManager.unpack(path.join(defaultPaths.downloadPath, getFilename));
      console.log('decompressJava:',decompressJava,data,downloadJava)
    });
/*     
    const javaInfo = await JavaInfoService.getJavaInfo(javaVersion);
    const TaskInfo = await taskManager.getTask(downloadJava.data);
    console.log("TaskInfo:", TaskInfo,downloadJava); 
    */
    // downloadJava {success: boolean, data: string} data:TaskId | string
    //console.log('Información de Java:', javaInfo);
    //console.log('Versiones de Java disponibles:', alljavaVersions);
    //  console.log('Descarga de Java:', downloadJava);
  } catch (error) {
    console.error('Error al obtener la información de Java:', error);
  }
}
async function example() {
    const javainstallations = await scanJavaInstallations(defaultPaths.unpackPath);
    console.log('Java Installations:', javainstallations);
    const javaVersion = 21; // Ejemplo de versión, puedes cambiarlo
    const findVersion = await findJavaVersion(defaultPaths.unpackPath, javaVersion);
    if (findVersion) {
      console.log(`Java ${javaVersion} encontrado:`, findVersion);
    }
    else {
      console.log(`Java ${javaVersion} no encontrado.`);
    }
}
example().catch(console.error);
//main().catch(console.error);