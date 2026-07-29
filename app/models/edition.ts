import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Item from '#models/item'
import QuizQuestion from '#models/quiz_question'

export default class Edition extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  /** The day this edition is for, as a 'YYYY-MM-DD' string. */
  @column()
  declare date: string

  /** Lifecycle of the edition: 'building', 'ready' or 'emailed'. */
  @column()
  declare status: string

  /** The edition's front-page headline, synthesised from the day's stories. */
  @column()
  declare headline: string | null

  /** A one-paragraph summary of the day, synthesised from the day's stories. */
  @column()
  declare summary: string | null

  @column()
  declare keyLearning: string | null

  @column.dateTime()
  declare emailedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Item)
  declare items: HasMany<typeof Item>

  @hasMany(() => QuizQuestion)
  declare quizQuestions: HasMany<typeof QuizQuestion>
}
