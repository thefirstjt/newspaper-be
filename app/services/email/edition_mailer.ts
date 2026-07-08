import { DateTime } from 'luxon'
import env from '#start/env'
import { renderEditionEmail, editionSubject } from '#mails/edition_digest'
import { presentEdition } from '#transformers/newspaper_presenter'
import { ResendEmailSender, FROM_NAME } from '#services/email/email_sender'
import type { EmailSender } from '#services/email/email_sender'
import type Edition from '#models/edition'
import type User from '#models/user'

// The transport-agnostic sender lives in #services/email/email_sender; re-export
// the parts the existing edition-mailer tests import from here.
export type { EmailMessage, EmailSender } from '#services/email/email_sender'
export { ResendEmailSender } from '#services/email/email_sender'

/**
 * Who an edition is sent to and how it is rendered. The recipient and their name
 * come from the reader's settings; the app url, sender address and the email
 * sender itself default to the environment / Resend, but can be passed in —
 * mainly so tests can capture the email without touching the network.
 */
export interface EditionMailerOptions {
  recipient?: string | null
  recipientName?: string | null
  appUrl?: string
  fromAddress?: string
  sender?: EmailSender
}

/**
 * Sends a reader's edition by email. It gathers the surfaced items, renders them
 * into the digest, sends it, and marks the edition as emailed so a re-run does
 * not send it twice by accident.
 */
export class EditionMailer {
  private recipient: string | null
  private recipientName: string
  private appUrl: string
  private fromAddress: string
  private sender: EmailSender

  constructor(options: EditionMailerOptions = {}) {
    this.recipient = options.recipient ?? env.get('EMAIL_RECIPIENT') ?? null
    this.recipientName = options.recipientName ?? env.get('EMAIL_RECIPIENT_NAME', 'there')
    this.appUrl = options.appUrl ?? env.get('APP_URL')
    this.fromAddress = options.fromAddress ?? env.get('SMTP_FROM', 'newspaper@percussionlabs.ai')
    this.sender = options.sender ?? new ResendEmailSender()
  }

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
      from: `${FROM_NAME} <${this.fromAddress}>`,
      to: this.recipient,
      subject: editionSubject(edition.date),
      html: renderEditionEmail(view, this.appUrl, this.recipientName),
    })

    edition.status = 'emailed'
    edition.emailedAt = DateTime.now()
    await edition.save()
  }
}

/** Builds an edition mailer that sends to the reader's own email and name. */
export function editionMailerForUser(user: User): EditionMailer {
  return new EditionMailer({
    recipient: user.email,
    recipientName: user.name ?? 'there',
  })
}
