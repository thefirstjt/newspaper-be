import { DateTime } from 'luxon'
import SubmittedLink from '#models/submitted_link'
import { presentSubmittedLink } from '#transformers/newspaper_presenter'
import { submitLinkValidator } from '#validators/newspaper'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Lets the reader feed their own links into the newspaper. A submitted link
 * becomes a high-priority candidate for the edition of the day it targets —
 * today, or tomorrow by default.
 */
export default class LinksController {
  async store({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const { url, note, targetDate } = await request.validateUsing(submitLinkValidator)

    const day =
      targetDate === 'today'
        ? DateTime.now().toISODate()!
        : DateTime.now().plus({ days: 1 }).toISODate()!

    const link = await SubmittedLink.create({
      userId: user.id,
      url,
      note: note ?? null,
      targetDate: day,
      source: 'api',
      status: 'pending',
    })

    return serialize(presentSubmittedLink(link))
  }
}
