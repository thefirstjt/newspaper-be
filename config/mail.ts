import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'
import type { InferMailers } from '@adonisjs/mail/types'

/**
 * Mail is sent over SMTP through Resend. Only the API key is required — the
 * host, port and username default to Resend's own values, and the password is
 * the Resend API key. The default sender is the newspaper's own address.
 */
const mailConfig = defineConfig({
  default: 'smtp',

  from: {
    address: env.get('SMTP_FROM', 'newspaper@percussionlabs.ai'),
    name: 'The Daily Newspaper',
  },

  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST', 'smtp.resend.com'),
      port: env.get('SMTP_PORT', 587),
      auth: {
        type: 'login',
        user: env.get('SMTP_USERNAME', 'resend'),
        pass: env.get('RESEND_API_KEY', ''),
      },
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
