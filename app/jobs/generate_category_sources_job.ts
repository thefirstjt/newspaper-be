import { Job } from '@rlanz/bull-queue'
import transmit from '@adonisjs/transmit/services/main'
import Category from '#models/category'
import User from '#models/user'
import { presentCategory } from '#transformers/newspaper_presenter'
import {
  categorySourcesChannelFor,
  generateSourcesForCategory,
} from '#services/sources/category_source_generation'

interface GenerateCategorySourcesPayload {
  userId: string
  categoryId: number
}

/**
 * Discovers sources in the background for a category the reader added by hand,
 * then announces the result on the reader's own Transmit channel for that
 * category. The dashboard adds the category straight away and shows its sources
 * loading; when the completed event arrives it swaps in the discovered sources.
 */
export default class GenerateCategorySourcesJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  async handle({ userId, categoryId }: GenerateCategorySourcesPayload) {
    const channel = categorySourcesChannelFor(userId, categoryId)
    const user = await User.findOrFail(userId)
    const category = await Category.query()
      .where('user_id', userId)
      .where('id', categoryId)
      .firstOrFail()

    await generateSourcesForCategory(user, category)

    transmit.broadcast(channel, {
      status: 'completed',
      category: presentCategory(category),
    })
  }

  /**
   * Called once the retries are exhausted. Let the waiting dashboard know the
   * discovery failed rather than leaving its loader spinning forever.
   */
  async rescue({ userId, categoryId }: GenerateCategorySourcesPayload, error: Error) {
    transmit.broadcast(categorySourcesChannelFor(userId, categoryId), {
      status: 'failed',
      error: error.message,
    })
  }
}
