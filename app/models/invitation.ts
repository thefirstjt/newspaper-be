import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Admin from '#models/admin'

/** How long an invitation's magic link stays valid. */
export const INVITATION_TTL_DAYS = 3

/**
 * An invitation for a prospective reader. It holds a single-use magic-link token
 * and an expiry; once accepted, it records the reader it created.
 */
export default class Invitation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare token: string

  /** 'pending' until the reader accepts, then 'accepted'. */
  @column()
  declare status: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column()
  declare acceptedUserId: string | null

  @column()
  declare invitedByAdminId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'acceptedUserId' })
  declare acceptedUser: BelongsTo<typeof User>

  @belongsTo(() => Admin, { foreignKey: 'invitedByAdminId' })
  declare invitedByAdmin: BelongsTo<typeof Admin>

  /** Whether the invitation is still usable — pending and not yet expired. */
  isUsable(): boolean {
    return this.status === 'pending' && this.expiresAt > DateTime.now()
  }

  /** A fresh random magic-link token. */
  static generateToken(): string {
    return randomBytes(32).toString('base64url')
  }
}
