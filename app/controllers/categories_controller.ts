import Category from '#models/category'
import { presentCategory } from '#transformers/newspaper_presenter'
import { createCategoryValidator, updateCategoryValidator } from '#validators/category'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * The reader's newspaper categories. Each belongs to the authenticated reader
 * and groups their sources; the key is a stable slug set at creation.
 */
export default class CategoriesController {
  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const categories = await Category.query()
      .where('user_id', user.id)
      .preload('sources')
      .orderBy('key')
    return serialize({ categories: categories.map((category) => presentCategory(category)) })
  }

  async store({ auth, request, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createCategoryValidator)

    if (data.max < data.min) {
      return response.unprocessableEntity({ error: 'max must be greater than or equal to min.' })
    }
    const clash = await Category.query().where('user_id', user.id).where('key', data.key).first()
    if (clash) {
      return response.unprocessableEntity({
        error: `You already have a category with the key "${data.key}".`,
      })
    }

    const category = await Category.create({ userId: user.id, ...data })
    await category.load('sources')
    return serialize(presentCategory(category))
  }

  async update({ auth, params, request, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const category = await Category.query().where('user_id', user.id).where('id', params.id).first()
    if (!category) {
      return response.notFound({ error: `There is no category with id ${params.id}.` })
    }

    const data = await request.validateUsing(updateCategoryValidator)
    category.merge(data)
    if (category.max < category.min) {
      return response.unprocessableEntity({ error: 'max must be greater than or equal to min.' })
    }
    await category.save()
    await category.load('sources')
    return serialize(presentCategory(category))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const category = await Category.query().where('user_id', user.id).where('id', params.id).first()
    if (!category) {
      return response.notFound({ error: `There is no category with id ${params.id}.` })
    }

    await category.delete()
    return response.noContent()
  }
}
