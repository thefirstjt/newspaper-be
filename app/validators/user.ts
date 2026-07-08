import vine from '@vinejs/vine'

/**
 * Validator to use before validating user credentials during login.
 */
export const loginValidator = vine.create({
  email: vine.string().email().maxLength(254),
  password: vine.string(),
})
