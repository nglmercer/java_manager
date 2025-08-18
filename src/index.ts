import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import JavaRouter from './routes/JavaGet.js'
import JavaMainRouter from './routes/Javamanager.js'
import coresRouter from './routes/mc/cores.js'
import { generationRouter } from './routes/mc/generate.js'
import { ResourceRouter } from './routes/Resource.js'
import {serverInfoRouter} from './routes/mc/servers.js'

const app = new Hono();
app.use(cors({
  origin: '*',
}))

app.route('/java', JavaRouter);
app.route('/java', JavaMainRouter);
app.route('/', generationRouter);
app.route('/hardware', ResourceRouter);
app.route('/mc/cores', coresRouter);
app.route('/mc/servers',serverInfoRouter)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
