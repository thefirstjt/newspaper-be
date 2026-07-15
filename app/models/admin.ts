import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

/**
 * An administrator. Admins log in with a username and password (not an email),
 * and their access tokens live in their own table, separate from readers.
 */
export default class Admin extends compose(
  BaseModel,
  withAuthFinder(hash, { uids: ['username'], passwordColumnName: 'password' })
) {
  static accessTokens = DbAccessTokensProvider.forModel(Admin, { table: 'admin_access_tokens' })
  declare currentAccessToken?: AccessToken

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare username: string

  @column({ serializeAs: null })
  declare password: string

  @column.dateTime()
  declare lastLoggedInAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
