import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { TaskManager,type TaskEvents } from 'node-task-manager';
import path from 'path';
const processDir = process.cwd();
const tempPath = (...args: string[]): string => {
  return path.join(processDir, ...args);
};
const defaultPaths: {
  downloadPath: string;
  unpackPath: string;
  backupPath: string;
} = {
  downloadPath: tempPath('temp', 'downloads'),
  unpackPath: tempPath('temp', 'unpacked'),
  backupPath: tempPath('temp', 'backups'),
}
const taskManager = new TaskManager(defaultPaths);
const TaskEventsNames: (keyof TaskEvents)[] = [
  'task:created',
  'task:started',
  'task:progress',
  'task:completed',
  'task:failed'
];
TaskEventsNames.forEach(eventName => {
  taskManager.on(eventName, (task) => {
    console.log(`Event: ${eventName}, Task ID: ${task.id}, Status: ${task.status}`);
  });
}); 
const app = new Hono()
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
