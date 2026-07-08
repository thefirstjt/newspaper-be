import env from '#start/env'
import { makeEmailSender, FROM_NAME, fromAddress } from '#services/email/email_sender'
import type { EmailSender } from '#services/email/email_sender'

/** Where the invited reader lands to begin onboarding; the token comes along. */
function magicLink(appUrl: string, token: string): string {
  return `${appUrl}/onboard?token=${encodeURIComponent(token)}`
}

/**
 * Sends the magic-link email that invites a reader to set up their newspaper.
 * The sender is injectable so tests can capture the email without touching the
 * network.
 */
export class InvitationMailer {
  constructor(
    private appUrl = env.get('APP_URL'),
    private from = fromAddress(),
    private sender: EmailSender = makeEmailSender()
  ) {}

  async send(email: string, token: string): Promise<void> {
    const link = magicLink(this.appUrl, token)
    await this.sender.send({
      from: `${FROM_NAME} <${this.from}>`,
      to: email,
      subject: "You're invited to your personal newspaper",
      html: renderInvitationEmail(link),
    })
  }
}

/** The invitation email's HTML — a short welcome and a link to get started. */
function renderInvitationEmail(link: string): string {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#F1F1F1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F1F1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="height:6px;line-height:6px;font-size:6px;background:#A676FC;">&nbsp;</td></tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#A676FC;">See Newspaper</p>
              <h1 style="margin:8px 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:#1E1647;">You're invited</h1>
              <p style="margin:0 0 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4560;">
                You've been invited to set up your own personal newspaper — hand-picked stories, a daily learning, and a quiz, tuned to what you care about. It takes a few minutes to get started, and the link below is valid for three days.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:#A676FC;">
                    <a href="${escapeAttribute(link)}" style="display:inline-block;padding:14px 30px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;border-radius:10px;text-decoration:none;">Set up my newspaper</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
          <tr><td style="padding:20px 40px;text-align:center;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#9B93B5;">See Newspaper by Percussion Labs</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
