import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import newspaperConfig from '#config/newspaper'
import { READER_DOCUMENTS } from '#services/context/document_registry'
import Category from '#models/category'
import Source from '#models/source'
import UserSetting from '#models/user_setting'
import ReaderDocument from '#models/reader_document'
import type User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Sets up a new account with just its basics: sensible default settings and a
 * copy of each reader-context document seeded from the shipped templates. It
 * does NOT create categories, sources or gap topics — the reader defines those
 * during onboarding (their categories in stage 3, their gap topics from the
 * persona in stage 2). Runs inside the caller's transaction so a half-seeded
 * account can never exist.
 */
export async function seedAccountBasics(user: User, trx: TransactionClientContract): Promise<void> {
  await UserSetting.create(
    {
      userId: user.id,
      quizMin: newspaperConfig.quiz.min,
      quizMax: newspaperConfig.quiz.max,
      runTime: newspaperConfig.schedule.runTime,
      emailEnabled: newspaperConfig.schedule.emailEnabled,
      emailFrequency: 'daily',
    },
    { client: trx }
  )

  for (const document of READER_DOCUMENTS) {
    const content = await readTemplate(document.filename)
    await ReaderDocument.create({ userId: user.id, key: document.key, content }, { client: trx })
  }
}

/**
 * Ensures a user has the default categories and their sources from
 * config/newspaper.ts. It is idempotent: a category already present (by key) is
 * left alone, and a source already present (by name within its category) is
 * skipped — so it can seed a brand-new user or top up an existing one. Returns
 * how many of each were added.
 */
export async function seedDefaultCategories(
  user: User,
  trx: TransactionClientContract
): Promise<{ categoriesAdded: number; sourcesAdded: number }> {
  let categoriesAdded = 0
  let sourcesAdded = 0

  for (const category of newspaperConfig.categories) {
    let created = await Category.query({ client: trx })
      .where('user_id', user.id)
      .where('key', category.key)
      .first()
    if (!created) {
      created = await Category.create(
        {
          userId: user.id,
          key: category.key,
          title: category.title,
          min: category.min,
          max: category.max,
          poolSize: category.poolSize,
          relevanceHint: category.relevanceHint,
        },
        { client: trx }
      )
      categoriesAdded += 1
    }

    for (const source of category.sources) {
      const exists = await Source.query({ client: trx })
        .where('category_id', created.id)
        .where('name', source.name)
        .first()
      if (!exists) {
        await Source.create(
          {
            userId: user.id,
            categoryId: created.id,
            type: source.type,
            name: source.name,
            settings: source.settings,
            enabled: true,
          },
          { client: trx }
        )
        sourcesAdded += 1
      }
    }
  }

  return { categoriesAdded, sourcesAdded }
}

/** Reads a reader-context template shipped under resources/context/. */
async function readTemplate(filename: string): Promise<string> {
  const path = join(app.makePath('resources/context'), filename)
  return readFile(path, 'utf-8')
}
