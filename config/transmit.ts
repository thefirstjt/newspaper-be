import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/transmit'
import { redis } from '@boringnode/bus/transports/redis'
import env from '#start/env'

export default defineConfig({
  // A heartbeat keeps otherwise-idle SSE connections open through the reverse
  // proxy and lets the server notice clients that have gone away.
  pingInterval: 30_000,

  // Broadcasts are made from the queue worker (edition builds, category
  // generation), but SSE clients are connected to the web process. A Redis
  // transport relays messages between the two processes so the events actually
  // reach the browser. Tests run as a single in-memory process with no worker,
  // so they skip the transport and need no Redis.
  transport: app.inTest
    ? null
    : {
        driver: redis({
          host: env.get('QUEUE_REDIS_HOST'),
          port: env.get('QUEUE_REDIS_PORT'),
          password: env.get('QUEUE_REDIS_PASSWORD'),
        }),
      },
})
