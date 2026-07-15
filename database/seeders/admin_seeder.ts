import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Seeds the default administrator. The password is written here in plain sight
 * on purpose, so it can be used to log in during development — change it (or
 * create a fresh admin with `node ace admin:create`) before anything real.
 */
export default class extends BaseSeeder {
  async run() {
    // Imported here, not at the top, so the model's password-hashing mixin runs
    // after the app has booted and the hash service exists.
    const { default: Admin } = await import('#models/admin')

    const username = 'jt'
    const password = 'jt-7Fq2Kp9ZxW4v'

    await Admin.updateOrCreate({ username }, { username, password })

    console.log(`Seeded admin "${username}" with password: ${password}`)
  }
}
