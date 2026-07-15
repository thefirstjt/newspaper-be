import vine from '@vinejs/vine'

/**
 * The fields a reader can change about their schedule and email delivery. Every
 * field is optional, so a request can update just the ones it names.
 */
export const scheduleValidator = vine.create({
  // A whole hour, as "HH:00" — the daily build runs on the hour, so minutes are
  // always zero.
  runTime: vine
    .string()
    .regex(/^([01]\d|2[0-3]):00$/)
    .optional(),
  emailEnabled: vine.boolean().optional(),
  emailFrequency: vine.enum(['daily', 'weekly', 'monthly']).optional(),
})

/** The full replacement list of a reader's learning-gap topics. */
export const gapTopicsValidator = vine.create({
  topics: vine.array(vine.string().trim().minLength(1).maxLength(200)),
})
