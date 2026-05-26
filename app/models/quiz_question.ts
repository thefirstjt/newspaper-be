import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Edition from '#models/edition'
import QuizAttempt from '#models/quiz_attempt'

export default class QuizQuestion extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare editionId: number

  /** The learning-gap topic this question is drawn from. */
  @column()
  declare topic: string

  @column()
  declare question: string

  /** The multiple-choice answers, stored as JSON text. */
  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value) as string[],
  })
  declare options: string[]

  /** Index into `options` of the correct answer. */
  @column()
  declare correctIndex: number

  @column()
  declare explanation: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Edition)
  declare edition: BelongsTo<typeof Edition>

  @hasMany(() => QuizAttempt)
  declare attempts: HasMany<typeof QuizAttempt>
}
