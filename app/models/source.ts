import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { SourceConfig, SourceType } from '#config/newspaper'

export default class Source extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare categoryKey: string

  /** How this source is read: 'rss', 'youtube' or 'websearch'. */
  @column()
  declare type: SourceType

  @column()
  declare name: string

  /**
   * Type-specific details for this source (feed url, channel id or query). It
   * is stored as JSON text and parsed back into an object when read.
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
}
