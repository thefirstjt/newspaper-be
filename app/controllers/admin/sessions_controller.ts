import Admin from '#models/admin'
import { adminLoginValidator } from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'

/** Signs an admin in with their username and password, returning an access token. */
export default class AdminSessionsController {
  async store({ request, serialize }: HttpContext) {
    const { username, password } = await request.validateUsing(adminLoginValidator)

    const admin = await Admin.verifyCredentials(username, password)
    const token = await Admin.accessTokens.create(admin)

    return serialize({
      admin: { id: admin.id, username: admin.username },
      token: token.value!.release(),
    })
  }

  /** Returns the currently authenticated admin. */
  async me({ auth, serialize }: HttpContext) {
    const admin = auth.use('admin').getUserOrFail()
    return serialize({ id: admin.id, username: admin.username })
  }

  async destroy({ auth }: HttpContext) {
    const admin = auth.use('admin').getUserOrFail()
    if (admin.currentAccessToken) {
      await Admin.accessTokens.delete(admin, admin.currentAccessToken.identifier)
    }
    return { message: 'Logged out successfully' }
  }
}
