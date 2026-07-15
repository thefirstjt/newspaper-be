import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Lets an admin see the readers and turn their accounts on or off. A
 * deactivated reader is skipped by the daily pipeline, cannot log in, and has
 * their existing sessions revoked.
 */
export default class AdminUsersController {
  async index({ serialize }: HttpContext) {
    const users = await User.query().orderBy('created_at', 'desc')
    return serialize({ users: users.map((user) => presentUser(user)) })
  }

  /** Flips a reader's active status. Deactivating also ends their sessions. */
  async toggleStatus({ params, serialize, response }: HttpContext) {
    const user = await User.find(params.id)
    if (!user) {
      return response.notFound({ error: `There is no user with id ${params.id}.` })
    }

    user.isActive = !user.isActive
    await user.save()

    if (!user.isActive) {
      // Revoke any active tokens so a deactivated reader is logged out too.
      await db.from('auth_access_tokens').where('tokenable_id', user.id).delete()
    }

    return serialize(presentUser(user))
  }
}

/** How a reader appears to an admin. */
function presentUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: Boolean(user.isActive),
    lastLoggedInAt: user.lastLoggedInAt?.toISO() ?? null,
    createdAt: user.createdAt.toISO(),
  }
}
