import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * A permanent record of every url that has already been shown to or rated by
 * the reader, so the same story never resurfaces in a later edition.
 */
export default class SeenUrl extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare urlHash: string

  @column()
  declare url: string

  @column.dateTime({ autoCreate: true })
  declare firstSeenAt: DateTime
}
