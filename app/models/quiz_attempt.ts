import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import QuizQuestion from '#models/quiz_question'

export default class QuizAttempt extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare quizQuestionId: number

  /** Index into the question's options that the reader chose. */
  @column()
  declare selectedIndex: number

  @column()
  declare isCorrect: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => QuizQuestion)
  declare quizQuestion: BelongsTo<typeof QuizQuestion>
}
