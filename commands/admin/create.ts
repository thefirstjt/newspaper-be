import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Creates an administrator. Pass --username and --password, or leave them out to
 * be prompted (the password is entered without echoing).
 */
export default class CreateAdmin extends BaseCommand {
  static commandName = 'admin:create'
  static description = 'Create an administrator who can invite readers'

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The admin username' })
  declare username?: string

  @flags.string({ description: 'The admin password' })
  declare password?: string

  async run() {
    // Imported here, not at the top, so the model (and its password-hashing
    // mixin) is evaluated after the app has booted and the hash service exists.
    const { default: Admin } = await import('#models/admin')

    const username = this.username ?? (await this.prompt.ask('Username'))
    const password = this.password ?? (await this.prompt.secure('Password'))

    const existing = await Admin.findBy('username', username)
    if (existing) {
      this.logger.error(`An admin with username "${username}" already exists.`)
      this.exitCode = 1
      return
    }

    await Admin.create({ username, password })
    this.logger.success(`Created admin "${username}".`)
  }
}
