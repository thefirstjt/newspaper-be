import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * The evolving, plain-language description of the reader's tastes. It is grown
 * from ratings and discards, and given to the model when it ranks candidates.
 */
export default class PreferenceProfile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare profileText: string

  /** Bumped each time the profile is rewritten, for a simple history trail. */
  @column()
  declare version: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
