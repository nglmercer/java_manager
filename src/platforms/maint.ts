import { env } from './env.js';
import { getJavaInfo } from '../services/java-info.service.js';
async function main() {
  try {
    const javaVersion = '17'; // Ejemplo de versión, puedes cambiarlo
    const javaInfo = await getJavaInfo(javaVersion);
    
    if (javaInfo) {
      console.log('Información de Java:', javaInfo);
    } else {
      console.log('No se encontró información para la versión especificada.');
    }
  } catch (error) {
    console.error('Error al obtener la información de Java:', error);
  }
}
main().catch(console.error);