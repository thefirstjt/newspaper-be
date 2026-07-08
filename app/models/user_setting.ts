import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * A reader's scalar preferences: the quiz size range, when the daily pipeline
 * runs, and how their edition is emailed. One row per user.
 */
export default class UserSetting extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare quizMin: number

  @column()
  declare quizMax: number

  /** The time of day (24-hour "HH:mm") the reader's pipeline should run. */
  @column()
  declare runTime: string

  @column()
  declare emailEnabled: boolean

  /** How often to email the reader: 'daily', 'weekly' or 'monthly'. */
  @column()
  declare emailFrequency: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
