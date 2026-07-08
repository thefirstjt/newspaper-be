import vine from '@vinejs/vine'

/** The type-specific details of a source (feed url, channel id, query, handle). */
const settings = () =>
  vine.object({
    feedUrl: vine.string().trim().url().optional(),
    channelId: vine.string().trim().maxLength(200).optional(),
    query: vine.string().trim().maxLength(500).optional(),
    username: vine.string().trim().maxLength(100).optional(),
  })

/** A new source, attached to one of the reader's categories. */
export const createSourceValidator = vine.create({
  categoryId: vine.number(),
  type: vine.enum(['rss', 'youtube', 'websearch', 'x']),
  name: vine.string().trim().minLength(1).maxLength(200),
  settings: settings(),
  enabled: vine.boolean().optional(),
})

/** Changes to an existing source. Every field is optional. */
export const updateSourceValidator = vine.create({
  categoryId: vine.number().optional(),
  type: vine.enum(['rss', 'youtube', 'websearch', 'x']).optional(),
  name: vine.string().trim().minLength(1).maxLength(200).optional(),
  settings: settings().optional(),
  enabled: vine.boolean().optional(),
})
