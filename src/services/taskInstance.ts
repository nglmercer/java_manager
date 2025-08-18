import { TaskManager,type TaskEvents } from 'node-task-manager';
import { defaultPaths } from '../config.js';
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
    const { payload,details,error,createdAt,updatedAt, ...showData } = task;

    console.log(`Event: ${eventName}`, task);
  });
}); 
export { taskManager };