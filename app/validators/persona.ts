import vine from '@vinejs/vine'

/**
 * The details a reader gives during onboarding, from which the model builds
 * their persona. Their role and at least one field they want to learn are
 * required; the rest are optional but sharpen the persona.
 */
export const personaValidator = vine.create({
  role: vine.string().trim().minLength(1).maxLength(200),
  industry: vine.string().trim().maxLength(200).nullable().optional(),
  experienceLevel: vine.string().trim().maxLength(100).nullable().optional(),
  learningGoals: vine.array(vine.string().trim().minLength(1).maxLength(200)).minLength(1),
  interests: vine.array(vine.string().trim().minLength(1).maxLength(200)).optional(),
  goals: vine.string().trim().maxLength(1000).nullable().optional(),
  preferredDepth: vine.enum(['deep', 'balanced', 'high-level']).nullable().optional(),
  avoid: vine.array(vine.string().trim().minLength(1).maxLength(200)).optional(),
  location: vine.string().trim().maxLength(200).nullable().optional(),
})
