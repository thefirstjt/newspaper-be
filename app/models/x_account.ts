import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * A cached mapping from an X (Twitter) handle to its numeric user id, kept per
 * reader. Resolving a handle costs an API call, so once we have learned an
 * account's id we store it here and reuse it on every later run.
 */
export default class XAccount extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  /** The reader this cache entry belongs to. */
  @column()
  declare userId: string

  /** The handle, stored lower-cased and without the leading @. */
  @column()
  declare username: string

  /** The numeric id X assigns to the account, kept as a string. */
  @column()
  declare xUserId: string

  @column.dateTime({ autoCreate: true })
  declare resolvedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
