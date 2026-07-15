import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column, beforeCreate, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { newId } from '#services/support/uuid'
import Edition from '#models/edition'
import Item from '#models/item'
import Source from '#models/source'
import Category from '#models/category'
import Rating from '#models/rating'
import QuizQuestion from '#models/quiz_question'
import QuizAttempt from '#models/quiz_attempt'
import SeenUrl from '#models/seen_url'
import SubmittedLink from '#models/submitted_link'
import ReaderDocument from '#models/reader_document'
import GapTopic from '#models/gap_topic'
import UserSetting from '#models/user_setting'
import XAccount from '#models/x_account'

export default class User extends compose(BaseModel, withAuthFinder(hash)) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  // The id is a UUID assigned by the app (see assignId), not a DB auto-increment,
  // so Lucid must not overwrite it with the insert's rowid.
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare lastLoggedInAt: DateTime | null

  /** When the reader was last sent an edition by email. */
  @column.dateTime()
  declare lastEditionSentAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  /** Assigns a UUID v7 primary key before insert, unless one was set already. */
  @beforeCreate()
  static assignId(user: User) {
    if (!user.id) {
      user.id = newId()
    }
  }

  get initials() {
    const [first, last] = this.name ? this.name.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }

  @hasMany(() => Edition)
  declare editions: HasMany<typeof Edition>

  @hasMany(() => Item)
  declare items: HasMany<typeof Item>

  @hasMany(() => Source)
  declare sources: HasMany<typeof Source>

  @hasMany(() => Category)
  declare categories: HasMany<typeof Category>

  @hasMany(() => Rating)
  declare ratings: HasMany<typeof Rating>

  @hasMany(() => QuizQuestion)
  declare quizQuestions: HasMany<typeof QuizQuestion>

  @hasMany(() => QuizAttempt)
  declare quizAttempts: HasMany<typeof QuizAttempt>

  @hasMany(() => SeenUrl)
  declare seenUrls: HasMany<typeof SeenUrl>

  @hasMany(() => SubmittedLink)
  declare submittedLinks: HasMany<typeof SubmittedLink>

  @hasMany(() => ReaderDocument)
  declare readerDocuments: HasMany<typeof ReaderDocument>

  @hasMany(() => GapTopic)
  declare gapTopics: HasMany<typeof GapTopic>

  @hasMany(() => XAccount)
  declare xAccounts: HasMany<typeof XAccount>

  @hasOne(() => UserSetting)
  declare settings: HasOne<typeof UserSetting>
}
