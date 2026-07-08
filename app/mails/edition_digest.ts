import { BaseMail } from '@adonisjs/mail'
import type { presentEdition } from '#transformers/newspaper_presenter'

/** The shape of the edition passed to the email, straight from the presenter. */
type EditionView = ReturnType<typeof presentEdition>

/**
 * The daily edition, delivered by email. It shows the same thing the reader
 * would see for the day — the key learning, the surfaced items grouped by
 * category, and the quiz — and ends with a button through to the app, where
 * they can read in full, rate, discard and answer the quiz.
 */
export default class EditionDigest extends BaseMail {
  constructor(
    private edition: EditionView,
    private recipient: string,
    private appUrl: string
  ) {
    super()
  }

  prepare() {
    this.message
      .to(this.recipient)
      .subject(`Your newspaper for ${this.edition.date}`)
      .html(renderEditionEmail(this.edition, this.appUrl))
  }
}

/** Builds the email's HTML from the day's edition. */
export function renderEditionEmail(edition: EditionView, appUrl: string): string {
  const sections = edition.categories
    .map((category) => {
      const items = category.items.map((item) => renderItem(item)).join('')
      return `
        <h2 style="font-size:18px;margin:32px 0 12px;color:#111;">${escapeHtml(category.title)}</h2>
        ${items}
      `
    })
    .join('')

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:12px;padding:32px;">
        <p style="margin:0;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Your Daily Newspaper</p>
        <h1 style="margin:4px 0 0;font-size:24px;color:#111;">${escapeHtml(edition.date)}</h1>

        ${renderKeyLearning(edition.keyLearning)}
        ${sections}
        ${renderQuiz(edition.quiz)}

        <div style="text-align:center;margin:40px 0 8px;">
          <a href="${escapeAttribute(appUrl)}"
             style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
            Open the newspaper
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0 0;">
        Rate stories, discard what you don't like, and take the quiz in the app.
      </p>
    </div>
  </body>
</html>`
}

function renderKeyLearning(keyLearning: string | null): string {
  if (!keyLearning) {
    return ''
  }
  return `
    <div style="background:#f9fafb;border-left:3px solid #111;border-radius:6px;padding:16px 20px;margin:24px 0;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Today's key learning</p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#111;">${escapeHtml(keyLearning)}</p>
    </div>
  `
}

function renderItem(item: EditionView['categories'][number]['items'][number]): string {
  const source = item.source ? `<span style="color:#6b7280;">${escapeHtml(item.source)}</span>` : ''
  const summary = item.summary
    ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(item.summary)}</p>`
    : ''
  return `
    <div style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
      <a href="${escapeAttribute(item.url)}" style="font-size:16px;font-weight:600;color:#111;text-decoration:none;">
        ${escapeHtml(item.title)}
      </a>
      <div style="margin-top:4px;font-size:13px;">${source}</div>
      ${summary}
    </div>
  `
}

function renderQuiz(quiz: EditionView['quiz']): string {
  if (quiz.length === 0) {
    return ''
  }
  const questions = quiz
    .map((question, index) => {
      const options = question.options
        .map((option) => `<li style="margin:2px 0;color:#374151;">${escapeHtml(option)}</li>`)
        .join('')
      return `
        <div style="margin:16px 0;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111;">
            ${index + 1}. ${escapeHtml(question.question)}
          </p>
          <ul style="margin:0;padding-left:20px;font-size:14px;">${options}</ul>
        </div>
      `
    })
    .join('')

  return `
    <h2 style="font-size:18px;margin:32px 0 4px;color:#111;">Today's quiz</h2>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Answer in the app to see how you did.</p>
    ${questions}
  `
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
