import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import env from '#start/env'
import EditionDigest from '#mails/edition_digest'
import { presentEdition } from '#transformers/newspaper_presenter'
import type Edition from '#models/edition'

/**
 * Sends the day's edition to the reader by email. It gathers the surfaced items
 * and the quiz, renders them into the digest, sends it, and marks the edition
 * as emailed so a re-run does not send it twice by accident.
 */
export class EditionMailer {
  /**
   * The recipient and the app url default to the environment, but can be passed
   * in (mainly so tests can send to a known address without touching env).
   */
  constructor(
    private recipient = env.get('EMAIL_RECIPIENT'),
    private appUrl = env.get('APP_URL')
  ) {}

  async deliver(edition: Edition): Promise<void> {
    if (!this.recipient) {
      throw new Error('EMAIL_RECIPIENT must be set to send the edition by email.')
    }

    await edition.load('items', (items) =>
      items.where('state', 'surfaced').preload('rating').orderBy('rank')
    )
    await edition.load('quizQuestions')

    const view = presentEdition(edition, edition.items, edition.quizQuestions)
    await mail.send(new EditionDigest(view, this.recipient, this.appUrl))

    edition.status = 'emailed'
    edition.emailedAt = DateTime.now()
    await edition.save()
  }
}
