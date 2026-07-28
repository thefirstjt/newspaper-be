import Source from '#models/source'
import Category from '#models/category'
import { presentSource } from '#transformers/newspaper_presenter'
import { createSourceValidator, updateSourceValidator } from '#validators/source'
import {
  makeYoutubeChannelResolver,
  YoutubeChannelResolutionError,
} from '#services/scout/youtube_channel_resolver'
import type { SourceConfig } from '#config/newspaper'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * The reader's sources. Each belongs to the authenticated reader and to one of
 * their categories; a source can only ever point at a category they own.
 */
export default class SourcesController {
  async index({ auth, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const sources = await Source.query().where('user_id', user.id).orderBy('category_id')
    return serialize({ sources: sources.map((source) => presentSource(source)) })
  }

  async store({ auth, request, serialize, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const data = await request.validateUsing(createSourceValidator)

    if (!(await this.ownsCategory(user.id, data.categoryId))) {
      return response.unprocessableEntity({ error: 'That category does not exist.' })
    }

    let settings = data.settings
    if (data.type === 'youtube') {
      try {
        settings = await this.withResolvedYoutubeChannel(settings)
      } catch (error) {
        if (error instanceof YoutubeChannelResolutionError) {
          return response.unprocessableEntity({ error: error.message })
        }
        throw error
      }
    }

    const source = await Source.create({
      userId: user.id,
      categoryId: data.categoryId,
      type: data.type,
      name: data.name,
      settings,
      enabled: data.enabled ?? true,
    })
    return serialize(presentSource(source))
  }

  async update({ auth, params, request, serialize, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const source = await Source.query().where('user_id', user.id).where('id', params.id).first()
    if (!source) {
      return response.notFound({ error: `There is no source with id ${params.id}.` })
    }

    const data = await request.validateUsing(updateSourceValidator)
    if (data.categoryId !== undefined && !(await this.ownsCategory(user.id, data.categoryId))) {
      return response.unprocessableEntity({ error: 'That category does not exist.' })
    }

    // Re-resolve the channel id whenever a youtube source is given a new channel url.
    const effectiveType = data.type ?? source.type
    if (effectiveType === 'youtube' && data.settings?.channelUrl) {
      try {
        data.settings = await this.withResolvedYoutubeChannel(data.settings)
      } catch (error) {
        if (error instanceof YoutubeChannelResolutionError) {
          return response.unprocessableEntity({ error: error.message })
        }
        throw error
      }
    }

    source.merge(data)
    await source.save()
    return serialize(presentSource(source))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const source = await Source.query().where('user_id', user.id).where('id', params.id).first()
    if (!source) {
      return response.notFound({ error: `There is no source with id ${params.id}.` })
    }

    await source.delete()
    return response.noContent()
  }

  /**
   * Resolves a youtube source's channel url to its channel id and returns the
   * settings with that id filled in. Throws YoutubeChannelResolutionError (which
   * the callers turn into a 422) when the url can't be resolved.
   */
  private async withResolvedYoutubeChannel(
    settings: SourceConfig['settings']
  ): Promise<SourceConfig['settings']> {
    const channelId = await makeYoutubeChannelResolver().resolve(settings.channelUrl ?? '')
    return { ...settings, channelId }
  }

  /** Whether the category exists and belongs to the reader. */
  private async ownsCategory(userId: string, categoryId: number): Promise<boolean> {
    const category = await Category.query().where('user_id', userId).where('id', categoryId).first()
    return category !== null
  }
}
