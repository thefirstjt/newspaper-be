import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * A cached mapping from an X (Twitter) handle to its numeric user id. Resolving
 * a handle costs an API call, so once we have learned an account's id we store
 * it here and reuse it on every later run.
 */
export default class XAccount extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  /** The handle, stored lower-cased and without the leading @. */
  @column()
  declare username: string

  /** The numeric id X assigns to the account, kept as a string. */
  @column()
  declare userId: string

  @column.dateTime({ autoCreate: true })
  declare resolvedAt: DateTime
}
