import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { seedDefaultCategories } from '#services/onboarding/user_seeder'
import { resolveUser } from '#services/support/resolve_user'

/**
 * Tops up a reader with the default categories and sources from
 * config/newspaper.ts, adding any they are missing. It is idempotent, so it is
 * safe to run repeatedly. Defaults to the sole active user; pass --user for one.
 */
export default class SeedDefaults extends BaseCommand {
  static commandName = 'newspaper:seed-defaults'
  static description = "Add the default categories and sources to a reader's setup"

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The reader, by email (defaults to the sole active user)' })
  declare user?: string

  async run() {
    const reader = await resolveUser(this.user)
    const { categoriesAdded, sourcesAdded } = await db.transaction((trx) =>
      seedDefaultCategories(reader, trx)
    )

    this.logger.success(
      `Seeded ${categoriesAdded} category(ies) and ${sourcesAdded} source(s) for ${reader.email}.`
    )
  }
}
