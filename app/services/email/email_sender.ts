import { Resend } from 'resend'
import env from '#start/env'

/** The sender's display name, shown in the recipient's inbox before the address. */
export const FROM_NAME = 'See Newspaper'

/** The sender address, from the environment, defaulting to the newspaper's own. */
export function fromAddress(): string {
  return env.get('SMTP_FROM', 'newspaper@percussionlabs.ai')
}

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

/*
 * A swappable factory for the default sender. Services that build their own
 * mailer (rather than receiving one) resolve it through here, so tests can
 * capture emails without touching the network.
 */
let senderFactory: () => EmailSender = () => new ResendEmailSender()

export function makeEmailSender(): EmailSender {
  return senderFactory()
}

export function setEmailSenderFactory(factory: () => EmailSender): void {
  senderFactory = factory
}

export function resetEmailSenderFactory(): void {
  senderFactory = () => new ResendEmailSender()
}
