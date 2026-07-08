import vine from '@vinejs/vine'

/** Accepting an invitation: the reader sets their name and a password. */
export const acceptInvitationValidator = vine.create({
  token: vine.string().trim().minLength(1),
  name: vine.string().trim().minLength(1).maxLength(200),
  password: vine.string().minLength(8).maxLength(32),
})
