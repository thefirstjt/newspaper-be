import vine from '@vinejs/vine'

/** Accepting an invitation: the reader sets their name and a password. */
export const acceptInvitationValidator = vine.create({
  token: vine.string().trim().minLength(1),
  name: vine.string().trim().minLength(1).maxLength(200),
  password: vine.string().minLength(8).maxLength(32),
})

/**
 * The onboarding screens, in order. A reader's `onboardingStep` is the one they
 * still need to complete; a brand-new account starts at the first.
 */
export const ONBOARDING_STEPS = [
  'schedule',
  'about_you',
  'persona_review',
  'your_paper',
  'sources',
] as const

/** The step a brand-new account starts on right after accepting its invitation. */
export const INITIAL_ONBOARDING_STEP: (typeof ONBOARDING_STEPS)[number] = 'about_you'

const STEP_INPUTS = [...ONBOARDING_STEPS, 'completed'] as const

/**
 * Advancing onboarding: the frontend reports the screen the reader has moved to,
 * or 'completed' once they finish the last one.
 */
export const onboardingStepValidator = vine.create({
  step: vine.enum(STEP_INPUTS),
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
