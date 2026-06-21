import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import Edition from '#models/edition'
import Rating from '#models/rating'

export default class Item extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare editionId: number

  @column()
  declare categoryKey: string

  @column()
  declare url: string

  /** Hash of the canonical url, used to dedupe against the seen-url store. */
  @column()
  declare urlHash: string

  @column()
  declare title: string

  @column()
  declare author: string | null

  @column()
  declare sourceName: string | null

  @column.dateTime()
  declare publishedAt: DateTime | null

  /** What kind of thing this is: 'article', 'video' or 'podcast'. */
  @column()
  declare mediaType: string

  /** Short description from the feed, used for the first ranking pass. */
  @column()
  declare snippet: string | null

  /** Full extracted article text, fetched only once an item is surfaced. */
  @column()
  declare fullText: string | null

  /** The model-written summary, generated once an item is surfaced. */
  @column()
  declare summary: string | null

  @column()
  declare relevanceScore: number | null

  @column()
  declare rank: number | null

  /** Where the item sits today: 'reserve', 'surfaced', 'discarded' or 'rated'. */
  @column()
  declare state: string

  @column()
  declare isUserSubmitted: boolean

  /** When this item's discard was folded into preferences, or null (also null unless discarded). */
  @column.dateTime()
  declare learnedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Edition)
  declare edition: BelongsTo<typeof Edition>

  @hasOne(() => Rating)
  declare rating: HasOne<typeof Rating>
}
