import { DateTime } from 'luxon'
import Invitation, { INVITATION_TTL_DAYS } from '#models/invitation'
import User from '#models/user'
import { InvitationMailer } from '#services/email/invitation_mailer'
import { createInvitationsValidator } from '#validators/invitation'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Lets an admin invite prospective readers. Each email gets a fresh magic link
 * that is valid for three days; an email that already belongs to a reader is
 * skipped, and re-inviting a still-pending email re-issues its link.
 */
export default class AdminInvitationsController {
  async store({ auth, request, serialize }: HttpContext) {
    const admin = auth.use('admin').getUserOrFail()
    const { emails } = await request.validateUsing(createInvitationsValidator)

    const mailer = new InvitationMailer()
    const invited: Invitation[] = []
    const skipped: string[] = []

    for (const email of unique(emails)) {
      if (await User.findBy('email', email)) {
        skipped.push(email)
        continue
      }

      const invitation = await this.issueInvitation(email, admin.id)
      await mailer.send(email, invitation.token)
      invited.push(invitation)
    }

    return serialize({
      invited: invited.map((invitation) => presentInvitation(invitation)),
      skipped,
    })
  }

  async index({ serialize }: HttpContext) {
    const invitations = await Invitation.query().orderBy('created_at', 'desc')
    return serialize({
      invitations: invitations.map((invitation) => presentInvitation(invitation)),
    })
  }

  /** Creates a fresh invitation, re-using a pending row for the email if one exists. */
  private async issueInvitation(email: string, adminId: number): Promise<Invitation> {
    const token = Invitation.generateToken()
    const expiresAt = DateTime.now().plus({ days: INVITATION_TTL_DAYS })

    const pending = await Invitation.query()
      .where('email', email)
      .where('status', 'pending')
      .first()
    if (pending) {
      pending.merge({ token, expiresAt, invitedByAdminId: adminId })
      await pending.save()
      return pending
    }

    return Invitation.create({ email, token, expiresAt, invitedByAdminId: adminId })
  }
}

/** The invitation as returned to the admin — never the raw token. */
function presentInvitation(invitation: Invitation) {
  return {
    id: invitation.id,
    email: invitation.email,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISO(),
    acceptedUserId: invitation.acceptedUserId,
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}
