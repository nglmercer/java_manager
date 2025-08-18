//import { TaskManager,type TaskEvents } from 'node-task-manager';
import path from 'path';
const processDir = process.cwd();
const tempPath = (...args: string[]): string => {
  return path.join(processDir, ...args);
};
const defaultPaths: {
  downloadPath: string;
  unpackPath: string;
  backupPath: string;
  serversPath: string;

} = {
  downloadPath: tempPath('temp', 'downloads'),
  unpackPath: tempPath('temp', 'unpacked'),
  serversPath: tempPath('temp', 'servers'),
  backupPath: tempPath('temp', 'backups'),
}
export {
  defaultPaths,
  tempPath
}
