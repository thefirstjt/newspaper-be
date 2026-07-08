import User from '#models/user'

/**
 * Resolves the user a CLI command should act on. With an email it looks that
 * user up; without one it defaults to the sole active user, and asks for an
 * email when the choice is ambiguous. This keeps the single-user convenience of
 * the commands while supporting more than one reader.
 */
export async function resolveUser(email?: string): Promise<User> {
  if (email) {
    const user = await User.findBy('email', email)
    if (!user) {
      throw new Error(`No user found with email ${email}.`)
    }
    return user
  }

  const active = await User.query().where('is_active', true)
  if (active.length === 0) {
    throw new Error('No active users found. Sign one up first.')
  }
  if (active.length > 1) {
    throw new Error('More than one active user — pass --user=<email> to choose one.')
  }
  return active[0]
}
