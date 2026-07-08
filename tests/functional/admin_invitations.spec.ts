import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Admin from '#models/admin'
import User from '#models/user'
import Invitation from '#models/invitation'
import {
  setEmailSenderFactory,
  resetEmailSenderFactory,
  type EmailMessage,
} from '#services/email/email_sender'

/** Captures the invitation emails instead of sending them. */
const sent: EmailMessage[] = []

async function adminToken(client: import('@japa/api-client').ApiClient) {
  await Admin.create({ username: 'root', password: 'supersecret' })
  const login = await client
    .post('/api/v1/admin/login')
    .json({ username: 'root', password: 'supersecret' })
  return login.body().data.token as string
}

test.group('Admin invitations', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
    setEmailSenderFactory(() => ({
      async send(message) {
        sent.push(message)
      },
    }))
    return () => resetEmailSenderFactory()
  })
  group.each.setup(() => {
    sent.length = 0
    return testUtils.db().truncate()
  })

  test('an admin invites multiple emails and each gets a magic link', async ({
    client,
    assert,
  }) => {
    const token = await adminToken(client)

    const response = await client
      .post('/api/v1/admin/invitations')
      .json({ emails: ['a@example.com', 'b@example.com'] })
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.lengthOf(response.body().data.invited, 2)

    const invitations = await Invitation.all()
    assert.lengthOf(invitations, 2)
    assert.equal(invitations[0].status, 'pending')
    assert.isTrue(invitations[0].expiresAt > DateTime.now())

    // One email captured per invitee, each linking to the onboarding page.
    assert.lengthOf(sent, 2)
    assert.isTrue(sent.every((message) => message.html.includes('/onboard?token=')))
  })

  test('an email that already belongs to a reader is skipped', async ({ client, assert }) => {
    await User.create({ name: 'Existing', email: 'taken@example.com', password: 'secret123' })
    const token = await adminToken(client)

    const response = await client
      .post('/api/v1/admin/invitations')
      .json({ emails: ['taken@example.com', 'fresh@example.com'] })
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)

    assert.deepEqual(response.body().data.skipped, ['taken@example.com'])
    assert.lengthOf(response.body().data.invited, 1)
    assert.lengthOf(sent, 1)
  })

  test('re-inviting a pending email re-issues one invitation', async ({ client, assert }) => {
    const token = await adminToken(client)
    const emails = { emails: ['again@example.com'] }

    await client
      .post('/api/v1/admin/invitations')
      .json(emails)
      .header('Authorization', `Bearer ${token}`)
    await client
      .post('/api/v1/admin/invitations')
      .json(emails)
      .header('Authorization', `Bearer ${token}`)

    // Still a single invitation row for the email, its token refreshed.
    assert.lengthOf(await Invitation.query().where('email', 'again@example.com'), 1)
  })

  test('a non-admin cannot invite', async ({ client }) => {
    const reader = await User.create({ name: 'R', email: 'r@example.com', password: 'secret123' })
    const response = await client
      .post('/api/v1/admin/invitations')
      .json({ emails: ['x@example.com'] })
      .loginAs(reader)
    response.assertStatus(401)
  })
})
