import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * A permanent record of every url that has already been shown to or rated by
 * the reader, so the same story never resurfaces in a later edition. Each reader
 * has their own set.
 */
export default class SeenUrl extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare urlHash: string

  @column()
  declare url: string

  @column.dateTime({ autoCreate: true })
  declare firstSeenAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
