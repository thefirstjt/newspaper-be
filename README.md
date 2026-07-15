# See Newspaper — backend

Backend for a personal AI newspaper: it scouts the web for each reader, builds a
daily edition tailored to their interests, and serves it over an API (and, if
enabled, by email).

Stack: [AdonisJS](https://adonisjs.com) v7 (TypeScript, ESM), Lucid ORM, a
Redis-backed job queue ([`@rlanz/bull-queue`](https://github.com/RomainLanz/bull-queue)),
and SQLite (local) or MySQL (production).

## Local development

Requires **Node 24**.

```bash
npm ci
cp .env.example .env
node ace generate:key   # sets APP_KEY
node ace migration:run
npm run dev             # serves on http://localhost:3333
```

By default this runs on SQLite with no external services. The queue-backed
features (edition builds, category generation) need Redis and a worker — start
one in a second terminal with `node ace queue:listen`.

Useful scripts: `npm test`, `npm run typecheck`, `npm run lint`.

## Deployment

The app ships as a Docker image and runs as a small stack: the **API**, a
**queue worker**, **MySQL**, and **Redis**. A `docker-compose.yml` wires all four
together.

### With docker-compose

1. Create and fill in the environment file:

   ```bash
   cp .env.example .env
   ```

   At minimum set:

   - `APP_KEY` — generate one with `node ace generate:key` (or
     `openssl rand -base64 32`).
   - `APP_URL` — the public URL the backend is reachable at.
   - `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` — the compose MySQL service is
     created with these same values, so the app and database always match.

   The provider API keys (`RESEND_API_KEY`, `OPENAI_API_KEY`,
   `ANTHROPIC_API_KEY`, etc.) are optional but needed for the features that use
   them. `DB_CONNECTION`, `DB_HOST`, `QUEUE_REDIS_HOST` and the ports are set for
   you by compose — you don't need to touch them.

2. Build and start the stack:

   ```bash
   docker compose up --build -d
   ```

   Compose brings things up in order: MySQL and Redis become healthy, a one-shot
   `migrate` service runs the migrations, then the `app` and `worker` start. The
   API is published on `PORT` (3333 by default).

3. Create the first admin so you can log in and invite readers:

   ```bash
   docker compose exec app node ace admin:create
   ```

Common operations:

```bash
docker compose logs -f app worker   # follow logs
docker compose exec app node ace migration:status
docker compose down                 # stop (add -v to also drop the volumes)
```

The `mysql-data` and `redis-data` volumes persist the database and queue across
restarts.

### Services

| Service   | Command                        | Purpose                                                        |
| --------- | ------------------------------ | -------------------------------------------------------------- |
| `app`     | `node bin/server.js`           | The HTTP API.                                                  |
| `worker`  | `node ace queue:listen`        | Consumes queued jobs — edition builds and category generation. |
| `migrate` | `node ace migration:run --force` | One-shot; runs on startup before `app`/`worker`.             |
| `mysql`   | —                              | Database.                                                      |
| `redis`   | —                              | Job queue backend.                                             |

> The **worker is not optional**: edition builds and onboarding category
> generation are dispatched as Redis jobs, so without it those features never
> run.

### Deploying without compose

The `Dockerfile` is a standard multi-stage build and runs anywhere — a VM, or a
platform such as Railway, Render or Fly.io — pointed at a managed MySQL and
Redis. Provide the same environment variables and run migrations as a release
step:

```bash
node ace migration:run --force
```

The image itself only starts the API (`node bin/server.js`). Run the queue
worker as a second process with `node ace queue:listen`, and make sure Redis and
MySQL are reachable. Required environment variables:

| Variable                             | Notes                                            |
| ------------------------------------ | ------------------------------------------------ |
| `APP_KEY`                            | App encryption key.                              |
| `APP_URL`                            | Public URL of the backend.                       |
| `DB_CONNECTION=mysql`                | Selects MySQL over the SQLite default.           |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | MySQL connection.        |
| `QUEUE_REDIS_HOST`, `QUEUE_REDIS_PORT`, `QUEUE_REDIS_PASSWORD` | Redis connection (password optional). |

Sensible defaults for `NODE_ENV`, `HOST`, `PORT`, `LOG_LEVEL` and
`SESSION_DRIVER` are baked into the image, so those only need setting to override
them. See `.env.example` for the full list, including the optional email,
language-model and content-discovery keys.
