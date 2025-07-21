import { Hono } from 'hono';
import { JavaInfoService,type JavaRelease } from '../services/java-info.service.js';
import { taskManager, defaultPaths } from '../services/taskInstance.js';
import { scanJavaInstallations,findJavaVersion } from '../services/java-installations.js';
import { FileUtils } from '../utils/file.utils.js';
import path from 'path';
const ARCHFILE_NAME = (release: JavaRelease): string => {
  const { featureVersion, arch, os } = release;
  return `${featureVersion}_${arch}_${os}.zip`;
}
const app = new Hono();
// PREFIX: /JAVA

app.delete('/delete/:version', async (c) => {
 const { version } = c.req.param();
 try {
    const existVersion = await findJavaVersion(defaultPaths.unpackPath,Number(version));
    console.log("existVersion",existVersion,version);
    if (!existVersion) {
      return c.json({ error: 'Java version not found' }, 404);
    }
    const deleteResult = await FileUtils.deletePath(defaultPaths.unpackPath, existVersion.folderName);
    return c.json(deleteResult);
  } catch (err) {
    console.error(err);
    return c.json({ error: 'error',message: String(err instanceof Error ? err.message : err) }, 500);
  }
});

export default app;