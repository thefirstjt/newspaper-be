import { DateTime } from 'luxon'

/** How often a reader is emailed their edition. */
export type EmailFrequency = 'daily' | 'weekly' | 'monthly'

/**
 * Whether a reader on the given frequency should be emailed on the given day.
 * Daily always sends; weekly sends on the first day of the week (Monday);
 * monthly on the first day of the month. An unknown frequency falls back to
 * daily so a reader is never silently dropped.
 */
export function isSendDay(frequency: string, dateISO: string): boolean {
  const date = DateTime.fromISO(dateISO)
  if (frequency === 'weekly') {
    return date.weekday === 1
  }
  if (frequency === 'monthly') {
    return date.day === 1
  }
  return true
}
