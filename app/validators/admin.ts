import vine from '@vinejs/vine'

/** The credentials an admin logs in with. */
export const adminLoginValidator = vine.create({
  username: vine.string().trim().minLength(1).maxLength(100),
  password: vine.string(),
})

/**
 * Changing an admin's own password: they must confirm their current password,
 * and the new one has to be at least 8 characters and contain both a letter and
 * a number.
 */
export const adminResetPasswordValidator = vine.create({
  currentPassword: vine.string(),
  newPassword: vine
    .string()
    .minLength(8)
    .maxLength(255)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/),
})
