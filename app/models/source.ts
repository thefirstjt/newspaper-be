import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { SourceConfig, SourceType } from '#config/newspaper'
import User from '#models/user'
import Category from '#models/category'

export default class Source extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare categoryId: number

  /** How this source is read: 'rss', 'youtube', 'websearch' or 'x'. */
  @column()
  declare type: SourceType

  @column()
  declare name: string

  /**
   * Type-specific details for this source (feed url, channel id, query or
   * username). Stored as JSON text and parsed back into an object when read.
   */
  @column({
    prepare: (value: SourceConfig['settings']) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value) as SourceConfig['settings'],
  })
  declare settings: SourceConfig['settings']

  @column()
  declare enabled: boolean

  @column.dateTime()
  declare lastFetchedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>
}
