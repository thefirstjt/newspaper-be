/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Database
  // Path to the SQLite file. Defaults to tmp/db.sqlite3; tests point this at a
  // separate file so they never touch real data.
  DB_FILENAME: Env.schema.string.optional(),

  // Reader context
  // Directory holding the living markdown documents about the reader. Defaults
  // to ./context; seeded from the shipped templates in resources/context.
  READER_CONTEXT_DIR: Env.schema.string.optional(),

  // Newspaper schedule
  // The time of day (24-hour "HH:mm") at which the daily pipeline runs: it
  // scouts the web, builds the edition and sends the email. Defaults to 9pm.
  NEWSPAPER_RUN_TIME: Env.schema.string.optional(),
  // Whether the daily edition is emailed. Turn this off to run in API-only mode
  // (for example when a frontend consumes the edition instead).
  EMAIL_ENABLED: Env.schema.boolean.optional(),

  // Email delivery (SMTP, via Resend)
  // The edition is emailed over SMTP through Resend. The password is the Resend
  // API key; the host, port and username default to Resend's values and rarely
  // need setting. SMTP_FROM is the sender address and EMAIL_RECIPIENT is where
  // the daily edition is sent.
  RESEND_API_KEY: Env.schema.string.optional(),
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_FROM: Env.schema.string.optional(),
  EMAIL_RECIPIENT: Env.schema.string.optional(),

  // Language models. Each task (ranking, summary, generation) picks its own
  // provider and model, so they can be mixed and matched. Only the keys for the
  // providers actually used need to be set.
  ANTHROPIC_API_KEY: Env.schema.string.optional(),
  OPENAI_API_KEY: Env.schema.string.optional(),
  LLM_RANKING_PROVIDER: Env.schema.enum.optional(['anthropic', 'openai'] as const),
  LLM_RANKING_MODEL: Env.schema.string.optional(),
  LLM_SUMMARY_PROVIDER: Env.schema.enum.optional(['anthropic', 'openai'] as const),
  LLM_SUMMARY_MODEL: Env.schema.string.optional(),
  LLM_GENERATION_PROVIDER: Env.schema.enum.optional(['anthropic', 'openai'] as const),
  LLM_GENERATION_MODEL: Env.schema.string.optional(),

  // Content discovery
  YOUTUBE_API_KEY: Env.schema.string.optional(),
  WEBSEARCH_API_KEY: Env.schema.string.optional(),
  // X (Twitter) API bearer token, used to read posts from configured accounts.
  X_API_KEY: Env.schema.string.optional(),

  // Telegram link ingestion (long-polling bot)
  TELEGRAM_BOT_TOKEN: Env.schema.string.optional(),
  // Only messages from this chat id are accepted, so no one else can feed links.
  TELEGRAM_ALLOWED_CHAT_ID: Env.schema.string.optional(),
})
