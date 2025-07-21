import { Hono } from 'hono';
import { JavaInfoService,type JavaRelease } from '../services/java-info.service.js';
import { taskManager, defaultPaths } from '../services/taskInstance.js';
import { scanJavaInstallations,findJavaVersion } from '../services/java-installations.js';
import path from 'path';
const ARCHFILE_NAME = (release: JavaRelease): string => {
  const { featureVersion, arch, os } = release;
  return `${featureVersion}_${arch}_${os}.zip`;
}
const app = new Hono();
// PREFIX: /JAVA

app.get('/all', async (c) => {
 // const { text } = c.req.query();
 try {
    const alljavaVersions = await JavaInfoService.getInstallableVersions();

    return c.json(alljavaVersions);
  } catch (err) {
    console.error(err);
    return c.json({ error: 'error',message: String(err instanceof Error ? err.message : err) }, 500);
  }
});
//IMCOMPLETE  RETURN null || {}
app.get('/find/:version', async (c) => {
  const version = c.req.param('version');
  try {
    const javaInfo = await findJavaVersion(defaultPaths.unpackPath,Number(version));
    if (!javaInfo) {
      return c.json({ error: 'Java version not found' }, 404);
    }
    return c.json(javaInfo);
  } catch (err) {
    console.error(err);
    return c.json({ error: 'error',message: String(err instanceof Error ? err.message : err) }, 500);
  }
});
//DOWNLOAD
app.get('/download/:version', async (c) => {
    const version = c.req.param('version');
    try {
    const alljavaVersions = await JavaInfoService.getInstallableVersions();
    const FindVersion = await JavaInfoService.filter(alljavaVersions.data.releases, Number(version));
    if (!FindVersion.data) {
      return c.json({ error: 'Java version not found' }, 404);
    }
    const getFilename = ARCHFILE_NAME(FindVersion.data);
    const downloadJava = await JavaInfoService.downloadJavaRelease(FindVersion.data, getFilename, async (data) => {
      const decompressJava = await taskManager.unpack(path.join(defaultPaths.downloadPath, getFilename));
      console.log('decompressJava:', decompressJava, data, downloadJava);
    });
    return c.json(downloadJava);
  } catch (err) {
      console.error(err);
      return c.json({ error: 'error',message: String(err instanceof Error ? err.message : err) }, 500);
    }
});
app.get('/scan', async (c) => {
  try {
    const installations = await scanJavaInstallations(defaultPaths.unpackPath);
    return c.json(installations);
  } catch (err) {
    console.error(err);
    return c.json({ error: 'error',message: String(err instanceof Error ? err.message : err) }, 500);
  }
});
export default app;