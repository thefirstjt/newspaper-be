import vine from '@vinejs/vine'

/** The emails an admin invites at once — at least one, each a valid address. */
export const createInvitationsValidator = vine.create({
  emails: vine.array(vine.string().trim().email().maxLength(254)).minLength(1),
})
