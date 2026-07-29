import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * A record of a single on-demand edition rebuild for a reader — when it happened
 * and whether an admin triggered it. Append-only, so there is no updated_at.
 */
export default class RebuildLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  /** True when an admin triggered the rebuild. */
  @column()
  declare triggeredByAdmin: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
