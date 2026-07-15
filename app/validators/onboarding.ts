import vine from '@vinejs/vine'

/** Accepting an invitation: the reader sets their name and a password. */
export const acceptInvitationValidator = vine.create({
  token: vine.string().trim().minLength(1),
  name: vine.string().trim().minLength(1).maxLength(200),
  password: vine.string().minLength(8).maxLength(32),
})

/**
 * Stage 3. The reader either names the categories they want, or describes their
 * interests in free text for the model to categorise. At least one must be given
 * (enforced in the controller); the model path is used when `interests` is set.
 */
export const onboardingCategoriesValidator = vine.create({
  categories: vine
    .array(
      vine.object({
        title: vine.string().trim().minLength(1).maxLength(200),
        description: vine.string().trim().maxLength(2000).optional(),
      })
    )
    .minLength(1)
    .optional(),
  interests: vine.string().trim().minLength(1).maxLength(5000).optional(),
})
