import vine from '@vinejs/vine'

/**
 * A new category. The key is a stable slug that ties the category to its items,
 * so it is set at creation and never changed afterwards.
 */
export const createCategoryValidator = vine.create({
  key: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(100)
    .regex(/^[a-z0-9-]+$/),
  title: vine.string().trim().minLength(1).maxLength(200),
  min: vine.number().min(0).max(50),
  max: vine.number().min(1).max(50),
  poolSize: vine.number().min(1).max(100),
  relevanceHint: vine.string().trim().minLength(1).maxLength(2000),
})

/** Changes to an existing category. Every field is optional; the key is fixed. */
export const updateCategoryValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(200).optional(),
  min: vine.number().min(0).max(50).optional(),
  max: vine.number().min(1).max(50).optional(),
  poolSize: vine.number().min(1).max(100).optional(),
  relevanceHint: vine.string().trim().minLength(1).maxLength(2000).optional(),
})
