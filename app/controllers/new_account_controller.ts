import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { signupValidator } from '#validators/user'
import { seedNewUser } from '#services/onboarding/user_seeder'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class NewAccountController {
  async store({ request, serialize }: HttpContext) {
    const { name, email, password } = await request.validateUsing(signupValidator)

    // Create the account and seed its default newspaper together, so a new user
    // is never left without config.
    const user = await db.transaction(async (trx) => {
      const created = new User()
      created.fill({ name, email, password })
      created.useTransaction(trx)
      await created.save()

      await seedNewUser(created, trx)
      return created
    })

    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
