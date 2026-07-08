import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Item from '#models/item'

export default class Rating extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare itemId: number

  /** The reader's score for the item, from 1 to 5. */
  @column()
  declare stars: number

  /** An optional note explaining the rating, fed into the preference profile. */
  @column()
  declare note: string | null

  /** When this rating was folded into the reader's preferences, or null if not yet. */
  @column.dateTime()
  declare learnedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Item)
  declare item: BelongsTo<typeof Item>
}
