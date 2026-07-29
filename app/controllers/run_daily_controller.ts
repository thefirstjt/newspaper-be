import type { HttpContext } from '@adonisjs/core/http'

/**
 * Rebuilding an edition is now an admin-only action (see the admin
 * `users/:id/rebuild-edition` endpoint). Readers can no longer trigger their own
 * rebuild, so this endpoint always reports that the request cannot be fulfilled.
 */
export default class RunDailyController {
  async store({ response }: HttpContext) {
    return response.badRequest({ error: 'This request cannot be fulfilled.' })
  }
}
