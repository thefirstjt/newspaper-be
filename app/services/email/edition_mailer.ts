import { Resend } from 'resend'
import { DateTime } from 'luxon'
import env from '#start/env'
import { renderEditionEmail, editionSubject } from '#mails/edition_digest'
import { presentEdition } from '#transformers/newspaper_presenter'
import type Edition from '#models/edition'
import type User from '#models/user'

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

/** The sender's display name, shown in the reader's inbox before the address. */
const FROM_NAME = 'See Newspaper'

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
