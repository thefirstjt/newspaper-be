import vine from '@vinejs/vine'

/**
 * The body accepted when rating an item: a whole-number score from 1 to 5 and
 * an optional short note on why.
 */
export const rateValidator = vine.create({
  stars: vine.number().min(1).max(5),
  note: vine.string().trim().maxLength(1000).nullable().optional(),
})

/** The body accepted when answering a quiz question: which option was chosen. */
export const answerValidator = vine.create({
  selectedIndex: vine.number().min(0),
})

/**
 * The body accepted when submitting a link for the newspaper: the url, an
 * optional note, and whether it is meant for today or tomorrow (tomorrow by
 * default, so a link sent in the evening lands in the next morning's edition).
 */
export const submitLinkValidator = vine.create({
  url: vine.string().trim().url(),
  note: vine.string().trim().maxLength(1000).nullable().optional(),
  targetDate: vine.enum(['today', 'tomorrow']).optional(),
})
