import vine from '@vinejs/vine'

/**
 * The fields a reader can change about their schedule and email delivery. Every
 * field is optional, so a request can update just the ones it names.
 */
export const scheduleValidator = vine.create({
  runTime: vine
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  emailEnabled: vine.boolean().optional(),
  emailFrequency: vine.enum(['daily', 'weekly', 'monthly']).optional(),
})

/** The full replacement list of a reader's learning-gap topics. */
export const gapTopicsValidator = vine.create({
  topics: vine.array(vine.string().trim().minLength(1).maxLength(200)),
})
