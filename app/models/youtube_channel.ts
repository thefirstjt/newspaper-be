import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * A cached mapping from a YouTube channel handle to its UC… channel id.
 * Resolving a handle costs an API call, so once we have learned a channel's id
 * we store it here and reuse it whenever that handle is added again. The mapping
 * is universal, so this cache is global rather than scoped to a reader.
 */
export default class YoutubeChannel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  /** The channel handle, stored lower-cased and without the leading @. */
  @column()
  declare handle: string

  /** The UC… channel id the handle resolves to. */
  @column()
  declare channelId: string

  @column.dateTime({ autoCreate: true })
  declare resolvedAt: DateTime
}
