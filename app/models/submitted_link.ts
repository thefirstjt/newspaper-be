import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * A link the reader sent in (via Telegram or the API) to be considered for the
 * newspaper on a given day.
 */
export default class SubmittedLink extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare url: string

  @column()
  declare note: string | null

  /** The day this link is meant for, as a 'YYYY-MM-DD' string. */
  @column()
  declare targetDate: string

  /** Where the link came from: 'telegram' or 'api'. */
  @column()
  declare source: string

  /** Whether the link is still waiting to be used: 'pending' or 'consumed'. */
  @column()
  declare status: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
