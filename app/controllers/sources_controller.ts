import Source from '#models/source'
import Category from '#models/category'
import { presentSource } from '#transformers/newspaper_presenter'
import { createSourceValidator, updateSourceValidator } from '#validators/source'
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

    const source = await Source.create({
      userId: user.id,
      categoryId: data.categoryId,
      type: data.type,
      name: data.name,
      settings: data.settings,
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

  /** Whether the category exists and belongs to the reader. */
  private async ownsCategory(userId: string, categoryId: number): Promise<boolean> {
    const category = await Category.query().where('user_id', userId).where('id', categoryId).first()
    return category !== null
  }
}
