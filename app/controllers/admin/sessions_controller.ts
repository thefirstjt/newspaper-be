import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import Admin from '#models/admin'
import { adminLoginValidator, adminResetPasswordValidator } from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'

/** Signs an admin in with their username and password, returning an access token. */
export default class AdminSessionsController {
  async store({ request, serialize }: HttpContext) {
    const { username, password } = await request.validateUsing(adminLoginValidator)

    const admin = await Admin.verifyCredentials(username, password)
    admin.lastLoggedInAt = DateTime.now()
    await admin.save()
    const token = await Admin.accessTokens.create(admin)

    return serialize({
      admin: presentAdmin(admin),
      token: token.value!.release(),
    })
  }

  /** Returns the currently authenticated admin. */
  async me({ auth, serialize }: HttpContext) {
    const admin = auth.use('admin').getUserOrFail()
    return serialize(presentAdmin(admin))
  }

  /**
   * Lets an authenticated admin change their own password. They must confirm
   * their current password, and the new one must meet the strength rules.
   */
  async resetPassword({ auth, request, response }: HttpContext) {
    const admin = auth.use('admin').getUserOrFail()
    const { currentPassword, newPassword } = await request.validateUsing(
      adminResetPasswordValidator
    )

    const currentIsValid = await hash.verify(admin.password, currentPassword)
    if (!currentIsValid) {
      return response.unprocessableEntity({ error: 'The current password is incorrect.' })
    }

    // The auth-finder mixin hashes the password on save when it has changed.
    admin.password = newPassword
    await admin.save()

    return { message: 'Password updated successfully.' }
  }

  async destroy({ auth }: HttpContext) {
    const admin = auth.use('admin').getUserOrFail()
    if (admin.currentAccessToken) {
      await Admin.accessTokens.delete(admin, admin.currentAccessToken.identifier)
    }
    return { message: 'Logged out successfully' }
  }
}

/** The admin as returned to the client — never the password. */
function presentAdmin(admin: Admin) {
  return {
    id: admin.id,
    username: admin.username,
    lastLoggedInAt: admin.lastLoggedInAt?.toISO() ?? null,
  }
}
