import { Resend } from 'resend'
import { DateTime } from 'luxon'
import env from '#start/env'
import { renderEditionEmail } from '#mails/edition_digest'
import { presentEdition } from '#transformers/newspaper_presenter'
import type Edition from '#models/edition'

/*
 * SMTP is kept as a second option, commented out for now. The `@adonisjs/mail`
 * package, `config/mail.ts` and the `EditionDigest` mail class are all still in
 * place, so switching back is a matter of sending through them instead of the
 * Resend client below:
 *
 *   import mail from '@adonisjs/mail/services/main'
 *   import EditionDigest from '#mails/edition_digest'
 *   await mail.send(new EditionDigest(view, this.recipient, this.appUrl))
 *
 * We use the Resend HTTP API here because this network blocks outbound SMTP.
 */

/** A ready-to-send email, kept transport-agnostic so the sender can be swapped. */
export interface EmailMessage {
  from: string
  to: string
  subject: string
  html: string
}

/** Sends an already-rendered email. Backed by Resend in production, faked in tests. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>
}

/** Sends email through the Resend HTTP API using the RESEND_API_KEY. */
export class ResendEmailSender implements EmailSender {
  constructor(private client = new Resend(env.get('RESEND_API_KEY', ''))) {}

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    })
    if (error) {
      throw new Error(`Resend could not send the email: ${error.message}`)
    }
  }
}

/**
 * Sends the day's edition to the reader by email. It gathers the surfaced items
 * and the quiz, renders them into the digest, sends it, and marks the edition
 * as emailed so a re-run does not send it twice by accident.
 *
 * The recipient, sender, app url and the underlying email sender all default to
 * the environment / Resend, but can be passed in — mainly so tests can capture
 * the email without touching the network.
 */
export class EditionMailer {
  constructor(
    private recipient = env.get('EMAIL_RECIPIENT'),
    private appUrl = env.get('APP_URL'),
    private from = env.get('SMTP_FROM', 'newspaper@percussionlabs.ai'),
    private sender: EmailSender = new ResendEmailSender()
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

    await this.sender.send({
      from: this.from,
      to: this.recipient,
      subject: `Your newspaper for ${edition.date}`,
      html: renderEditionEmail(view, this.appUrl),
    })

    edition.status = 'emailed'
    edition.emailedAt = DateTime.now()
    await edition.save()
  }
}
