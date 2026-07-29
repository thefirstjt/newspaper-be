import { BaseMail } from '@adonisjs/mail'
import { DateTime } from 'luxon'
import type { presentEdition } from '#transformers/newspaper_presenter'

/** The shape of the edition passed to the email, straight from the presenter. */
type EditionView = ReturnType<typeof presentEdition>
type CategoryView = EditionView['categories'][number]
type ItemView = CategoryView['items'][number]

/*
 * The brand palette (Percussion Labs) and typography. Headlines are set in Lora
 * — a serif that reads as confident and elegant — and everything else in Geist.
 * Email clients that block web fonts fall back to Georgia and the system sans,
 * which keep the same serif/sans feel.
 */
const PURPLE = '#A676FC'
const NAVY = '#1E1647'
const DEEP_PURPLE = '#4C398F'
const LAVENDER_LINE = '#EDE7FB'
const PAGE_BG = '#F1F1F1'
const BODY_TEXT = '#4A4560'
const MUTED_TEXT = '#9B93B5'

const HEAD_FONT = "'Lora', Georgia, 'Times New Roman', serif"
const BODY_FONT =
  "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

/**
 * The daily edition, delivered by email. It opens with a short greeting and
 * then the day's news, grouped by category, and ends with a button through to
 * the app — where the reader can read in full, rate, discard, and take the
 * quiz. The key learning and quiz are deliberately kept out of the email to
 * keep it a light, scannable brief.
 */
export default class EditionDigest extends BaseMail {
  constructor(
    private edition: EditionView,
    private recipient: string,
    private appUrl: string,
    private recipientName: string
  ) {
    super()
  }

  prepare() {
    this.message
      .to(this.recipient)
      .subject(editionSubject(this.edition.date, this.edition.headline))
      .html(renderEditionEmail(this.edition, this.appUrl, this.recipientName))
  }
}

/** The email subject: inviting, with the day in DD/MM/YYYY. */
/**
 * The email subject: the day's headline as the lead, then "your stories for
 * <date>". Falls back to a generic lead for an edition with no headline.
 */
export function editionSubject(date: string, headline?: string | null): string {
  const lead = headline?.trim() || 'Fresh off the press'
  return `${lead} — your stories for ${formatShortDate(date)}`
}

/**
 * The masthead: the day's front-page headline and one-paragraph summary when the
 * edition has them, or just the date for an edition built before headlines existed.
 */
function renderMasthead(edition: EditionView): string {
  if (!edition.headline) {
    return `
      <p style="margin:0;font-family:${BODY_FONT};font-size:12px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${PURPLE};">See Newspaper</p>
      <h1 style="margin:8px 0 0;font-family:${HEAD_FONT};font-size:30px;line-height:1.15;font-weight:700;color:${NAVY};">${escapeHtml(formatDate(edition.date))}</h1>`
  }

  const summary = edition.summary
    ? `<p style="margin:14px 0 0;font-family:${BODY_FONT};font-size:16px;line-height:1.6;color:${DEEP_PURPLE};">${escapeHtml(edition.summary)}</p>`
    : ''

  return `
      <p style="margin:0;font-family:${BODY_FONT};font-size:12px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${PURPLE};">See Newspaper &middot; ${escapeHtml(formatDate(edition.date))}</p>
      <h1 style="margin:8px 0 0;font-family:${HEAD_FONT};font-size:30px;line-height:1.15;font-weight:700;color:${NAVY};">${escapeHtml(edition.headline)}</h1>
      ${summary}`
}

/** Builds the email's HTML from the day's edition. */
export function renderEditionEmail(
  edition: EditionView,
  appUrl: string,
  recipientName: string
): string {
  const sections = edition.categories.map((category) => renderCategory(category)).join('')
  const year = edition.date.slice(0, 4)
  const masthead = renderMasthead(edition)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>See Newspaper</title>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500&family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    body { margin:0; padding:0; background:${PAGE_BG}; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; }
    @media (max-width:620px) {
      .container { width:100% !important; }
      .px { padding-left:24px !important; padding-right:24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:6px;line-height:6px;font-size:6px;background:${DEEP_PURPLE};">&nbsp;</td>
          </tr>
          <tr>
            <td class="px" style="padding:36px 40px 0;">
              ${masthead}
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:22px 40px 0;">
              <p style="margin:0;font-family:${BODY_FONT};font-size:16px;line-height:1.6;color:${DEEP_PURPLE};">Hi ${escapeHtml(recipientName)}, here's your news for today:</p>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:4px 40px 0;">
              ${sections || renderEmptyState()}
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:28px 40px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:${DEEP_PURPLE};">
                    <a href="${escapeAttribute(appUrl)}" style="display:inline-block;padding:14px 30px;font-family:${BODY_FONT};font-size:15px;font-weight:600;color:#ffffff;border-radius:10px;">Visit Newspaper</a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${MUTED_TEXT};">
                Button not working? Copy and paste this link into your browser:<br>
                <a href="${escapeAttribute(appUrl)}" style="color:${DEEP_PURPLE};word-break:break-all;">${escapeHtml(appUrl)}</a>
              </p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
          <tr>
            <td class="px" style="padding:20px 40px;text-align:center;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${MUTED_TEXT};">
              &copy; ${escapeHtml(year)}, See Newspapers by <span style="color:${NAVY};font-weight:600;">Percussion Labs</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** One category section: a small label, a divider, then its stories. */
function renderCategory(category: CategoryView): string {
  const items = category.items.map((item) => renderItem(item)).join('')
  return `
    <div style="margin-top:32px;">
      <p style="margin:0 0 10px;font-family:${BODY_FONT};font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${PURPLE};">${escapeHtml(category.title)}</p>
      ${items}
    </div>
  `
}

/** One story: headline (a link), its source, and the summary. */
function renderItem(item: ItemView): string {
  const source = item.source
    ? `<p style="margin:8px 0 0;font-family:${BODY_FONT};font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${PURPLE};">${escapeHtml(item.source)}</p>`
    : ''
  const summary = item.summary
    ? `<p style="margin:8px 0 0;font-family:${BODY_FONT};font-size:14px;line-height:1.65;color:${BODY_TEXT};">${escapeHtml(item.summary)}</p>`
    : ''
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LAVENDER_LINE};">
      <tr>
        <td style="padding:18px 0;">
          <a href="${escapeAttribute(item.url)}" style="font-family:${HEAD_FONT};font-size:20px;line-height:1.3;font-weight:600;color:${NAVY};">${escapeHtml(item.title)}</a>
          ${source}
          ${summary}
        </td>
      </tr>
    </table>
  `
}

/** Shown on the rare day nothing was surfaced, so the email is never blank. */
function renderEmptyState(): string {
  return `<p style="margin:24px 0 0;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${BODY_TEXT};">Nothing made the cut today — check back tomorrow.</p>`
}

/** Turns a 'YYYY-MM-DD' date into something like "Wednesday, 8 July 2026". */
function formatDate(date: string): string {
  const parsed = DateTime.fromISO(date)
  return parsed.isValid ? parsed.toFormat('cccc, d LLLL yyyy') : date
}

/** Turns a 'YYYY-MM-DD' date into "DD/MM/YYYY". */
function formatShortDate(date: string): string {
  const parsed = DateTime.fromISO(date)
  return parsed.isValid ? parsed.toFormat('dd/MM/yyyy') : date
}

/** Escapes text placed into element content. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Escapes a value placed into an HTML attribute such as href. */
function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}
