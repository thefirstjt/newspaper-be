import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import { IANAZone } from 'luxon'

/**
 * Accepts only a real IANA timezone name, such as 'Africa/Lagos' or 'UTC'. The
 * reader's run time is a wall-clock hour in this zone, so it has to be a zone
 * the scheduler can actually convert.
 */
const isTimezone = vine.createRule((value: unknown, _options: undefined, field: FieldContext) => {
  if (typeof value !== 'string') return
  if (!IANAZone.isValidZone(value)) {
    field.report('The {{ field }} field must be a valid IANA timezone', 'timezone', field)
  }
})

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
  timezone: vine.string().use(isTimezone()).optional(),
  emailEnabled: vine.boolean().optional(),
  emailFrequency: vine.enum(['daily', 'weekly', 'monthly']).optional(),
})

/** The full replacement list of a reader's learning-gap topics. */
export const gapTopicsValidator = vine.create({
  topics: vine.array(vine.string().trim().minLength(1).maxLength(200)),
})
