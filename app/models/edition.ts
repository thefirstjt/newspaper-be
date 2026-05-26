import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Item from '#models/item'
import QuizQuestion from '#models/quiz_question'

export default class Edition extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  /** The day this edition is for, as a 'YYYY-MM-DD' string. */
  @column()
  declare date: string

  /** Lifecycle of the edition: 'building', 'ready' or 'emailed'. */
  @column()
  declare status: string

  @column()
  declare keyLearning: string | null

  @column.dateTime()
  declare emailedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Item)
  declare items: HasMany<typeof Item>

  @hasMany(() => QuizQuestion)
  declare quizQuestions: HasMany<typeof QuizQuestion>
}
