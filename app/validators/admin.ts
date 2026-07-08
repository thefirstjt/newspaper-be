import vine from '@vinejs/vine'

/** The credentials an admin logs in with. */
export const adminLoginValidator = vine.create({
  username: vine.string().trim().minLength(1).maxLength(100),
  password: vine.string(),
})
