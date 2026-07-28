import db from '@adonisjs/lucid/services/db'
import Invitation from '#models/invitation'
import User from '#models/user'
import { seedAccountBasics } from '#services/onboarding/user_seeder'
import {
  categoriesChannelFor,
  makeCategoryGenerationDispatcher,
} from '#services/onboarding/category_generation'
import { DateTime } from 'luxon'
import {
  acceptInvitationValidator,
  onboardingCategoriesValidator,
  onboardingStepValidator,
  INITIAL_ONBOARDING_STEP,
} from '#validators/onboarding'
import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * The reader-facing onboarding flow, entered through an invitation's magic link.
 * Stage 1 lives here: confirming the invitation and accepting it (creating the
 * account). Later stages — persona (stage 2) and categories (stage 3) — are on
 * their own routes and need the reader to be authenticated.
 */
export default class OnboardingController {
  /** Confirms an invitation token and returns the email it was sent to. */
  async invitation({ request, response }: HttpContext) {
    const token = request.qs().token
    const invitation = typeof token === 'string' ? await Invitation.findBy('token', token) : null

    if (!invitation || !invitation.isUsable()) {
      return response.notFound({ error: 'This invitation is invalid or has expired.' })
    }

    return response.ok({ data: { email: invitation.email } })
  }

  /**
   * Accepts an invitation: creates the reader's account (name + password, email
   * from the invitation), seeds the account basics, marks the invitation used,
   * and logs the reader in so they can continue onboarding.
   */
  async accept({ request, serialize, response }: HttpContext) {
    const { token, name, password } = await request.validateUsing(acceptInvitationValidator)

    const invitation = await Invitation.findBy('token', token)
    if (!invitation || !invitation.isUsable()) {
      return response.unprocessableEntity({ error: 'This invitation is invalid or has expired.' })
    }
    if (await User.findBy('email', invitation.email)) {
      return response.conflict({ error: 'An account for this email already exists.' })
    }

    const user = await db.transaction(async (trx) => {
      const created = new User()
      created.fill({
        name,
        email: invitation.email,
        password,
        isActive: true,
        onboardingStep: INITIAL_ONBOARDING_STEP,
      })
      created.useTransaction(trx)
      await created.save()

      await seedAccountBasics(created, trx)

      invitation.merge({ status: 'accepted', acceptedUserId: created.id })
      invitation.useTransaction(trx)
      await invitation.save()

      return created
    })

    const accessToken = await User.accessTokens.create(user)
    return serialize({
      user: UserTransformer.transform(user),
      token: accessToken.value!.release(),
    })
  }

  /**
   * Stage 3: the reader either names the categories they want or describes their
   * interests in free text (which the model turns into categories). Building the
   * categories and discovering their sources is slow — LLM calls plus feed
   * checks — so it is queued rather than run inline. We return the reader's
   * Transmit channel; the frontend shows a loader and subscribes, and the job
   * broadcasts the finished categories (or a failure) there when it is done.
   */
  async categories({ auth, request, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const { categories, interests } = await request.validateUsing(onboardingCategoriesValidator)

    if (!categories && !interests) {
      return response.unprocessableEntity({
        error: 'Provide either a list of categories or your interests.',
      })
    }

    await makeCategoryGenerationDispatcher().dispatch(user.id, { categories, interests })

    return response.accepted({ data: { channel: categoriesChannelFor(user.id) } })
  }

  /**
   * Records how far the reader has got in onboarding. The frontend reports the
   * screen they have moved to as they go, or 'completed' after the last one —
   * which clears the step and stamps the completion time. The updated reader is
   * returned so the caller sees the new step straight away.
   */
  async step({ auth, request, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const { step } = await request.validateUsing(onboardingStepValidator)

    // Onboarding is a one-time flow. Once it is finished (step already cleared),
    // reporting progress does nothing rather than dropping a settled reader back
    // into onboarding — we just hand back their current, completed state.
    if (user.onboardingStep === null) {
      return serialize(UserTransformer.transform(user))
    }

    if (step === 'completed') {
      user.onboardingStep = null
      user.onboardingCompletedAt = user.onboardingCompletedAt ?? DateTime.now()
    } else {
      user.onboardingStep = step
    }
    await user.save()

    return serialize(UserTransformer.transform(user))
  }
}
