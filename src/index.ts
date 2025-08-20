import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import JavaRouter from './routes/JavaGet.js'
import JavaMainRouter from './routes/Javamanager.js'
import coresRouter from './routes/mc/cores.js'
import { generationRouter } from './routes/mc/generate.js'
import { ResourceRouter } from './routes/Resource.js'
import {serverInfoRouter} from './routes/mc/serverInfo.js'
import { servermanager } from './routes/mc/servermanager.js'
import FilemanagerRouter from './routes/files/index.js'
import extensionsJarRouter from './routes/files/extensionsJar.js'
import { SocketIOLikeServer, SocketIOLikeSocket, defaultLogger } from 'ws-socketio-adapter';
import { emitter } from './Emitter.js'


const wsServer = new SocketIOLikeServer();
const app = new Hono();
app.use(cors({
  origin: '*',
}))

app.route('/java', JavaRouter);
app.route('/java', JavaMainRouter);
app.route('/', generationRouter);
app.route('/hardware', ResourceRouter);
app.route('/mc/cores', coresRouter);
app.route('/mc/servers',serverInfoRouter);
app.route('/mc/servermanager', servermanager);
app.route('/files', FilemanagerRouter);
app.route('/extensions', extensionsJarRouter);

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const server = await serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
wsServer.attach(server);
wsServer.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  emitter.onAny((event, ...args) => {
    if (event.startsWith('server')){
      console.log("Evento:", event, "Argumentos:", ...args)
    }
    socket.emit(event, ...args)
  
  })
});

