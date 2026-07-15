import { Job } from '@rlanz/bull-queue'
import transmit from '@adonisjs/transmit/services/main'
import User from '#models/user'
import { presentCategory } from '#transformers/newspaper_presenter'
import {
  categoriesChannelFor,
  generateCategoriesAndSources,
} from '#services/onboarding/category_generation'
import type { CategoryGenerationInput } from '#services/onboarding/category_generation'

interface GenerateCategoriesPayload {
  userId: string
  input: CategoryGenerationInput
}

/**
 * Runs stage 3 in the background: builds the reader's categories and discovers
 * their sources, then announces the result on the reader's own Transmit channel.
 * The frontend shows a loader after kicking this off and swaps it for the
 * categories when the completed event arrives.
 */
export default class GenerateCategoriesJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  async handle({ userId, input }: GenerateCategoriesPayload) {
    const channel = categoriesChannelFor(userId)
    const user = await User.findOrFail(userId)

    const categories = await generateCategoriesAndSources(user, input)

    transmit.broadcast(channel, {
      status: 'completed',
      categories: categories.map((category) => presentCategory(category)),
    })
  }

  /**
   * Called once the retries are exhausted. Let the waiting frontend know the
   * generation failed rather than leaving its loader spinning forever.
   */
  async rescue({ userId }: GenerateCategoriesPayload, error: Error) {
    transmit.broadcast(categoriesChannelFor(userId), {
      status: 'failed',
      error: error.message,
    })
  }
}
