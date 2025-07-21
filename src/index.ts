import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import JavaRouter from './routes/JavaGet.js'
import JavaMainRouter from './routes/Javamanager.js'
const app = new Hono();
app.route('/java', JavaRouter);
app.route('/java', JavaMainRouter);
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
