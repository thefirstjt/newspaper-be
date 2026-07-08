import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Source from '#models/source'

/**
 * One section of a reader's newspaper. Groups the reader's sources and says how
 * many items to surface each day and what makes an item relevant.
 */
export default class Category extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  /** Stable per-reader identifier, e.g. 'eng-blogs'. */
  @column()
  declare key: string

  @column()
  declare title: string

  @column()
  declare min: number

  @column()
  declare max: number

  @column()
  declare poolSize: number

  @column()
  declare relevanceHint: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Source)
  declare sources: HasMany<typeof Source>
}
