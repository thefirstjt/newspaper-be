import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * One living markdown document about a reader (persona, preferences, or learning
 * focus). Seeded from a template on signup, then kept up to date by the reader
 * and the model over time.
 */
export default class ReaderDocument extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  /** Which document this is: 'persona', 'preferences' or 'learning-focus'. */
  @column()
  declare key: string

  @column()
  declare content: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
