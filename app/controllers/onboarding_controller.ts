import db from '@adonisjs/lucid/services/db'
import Invitation from '#models/invitation'
import User from '#models/user'
import { seedAccountBasics } from '#services/onboarding/user_seeder'
import { acceptInvitationValidator } from '#validators/onboarding'
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
      created.fill({ name, email: invitation.email, password, isActive: true })
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
}
