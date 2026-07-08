import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import newspaperConfig from '#config/newspaper'
import { READER_DOCUMENTS } from '#services/context/document_registry'
import Category from '#models/category'
import Source from '#models/source'
import GapTopic from '#models/gap_topic'
import UserSetting from '#models/user_setting'
import ReaderDocument from '#models/reader_document'
import type User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Gives a brand-new user the default newspaper: the starter categories and
 * their sources, the default learning-gap topics, sensible settings, and a copy
 * of each reader-context document seeded from the shipped templates. Everything
 * runs inside the caller's transaction so a half-seeded account can never exist.
 * The values come from config/newspaper.ts, which now serves as the defaults for
 * every new reader.
 */
export async function seedNewUser(user: User, trx: TransactionClientContract): Promise<void> {
  await UserSetting.create(
    {
      userId: user.id,
      quizMin: newspaperConfig.quiz.min,
      quizMax: newspaperConfig.quiz.max,
      runTime: newspaperConfig.schedule.runTime,
      emailEnabled: newspaperConfig.schedule.emailEnabled,
      emailRecipient: user.email,
      emailRecipientName: user.name ?? 'there',
    },
    { client: trx }
  )

  for (const [position, topic] of newspaperConfig.gapTopics.entries()) {
    await GapTopic.create({ userId: user.id, topic, position }, { client: trx })
  }

  for (const category of newspaperConfig.categories) {
    const created = await Category.create(
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

    for (const source of category.sources) {
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
    }
  }

  for (const document of READER_DOCUMENTS) {
    const content = await readTemplate(document.filename)
    await ReaderDocument.create({ userId: user.id, key: document.key, content }, { client: trx })
  }
}

/** Reads a reader-context template shipped under resources/context/. */
async function readTemplate(filename: string): Promise<string> {
  const path = join(app.makePath('resources/context'), filename)
  return readFile(path, 'utf-8')
}
