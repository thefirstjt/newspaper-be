import db from '@adonisjs/lucid/services/db'
import GapTopic from '#models/gap_topic'
import { contextStoreFor } from '#services/context/context_store_manager'
import { PersonaBuilder } from '#services/orchestrator/persona_builder'
import { personaValidator } from '#validators/persona'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Builds the reader's persona from the details they give during onboarding. The
 * model turns those details into their persona document, and the fields they
 * want to learn become their learning-gap topics (which drive the key learning
 * and quiz). Re-submitting replaces both.
 */
export default class PersonaController {
  async update({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const input = await request.validateUsing(personaValidator)

    const persona = await new PersonaBuilder().buildPersona(input)
    await contextStoreFor(user.id).write('persona', persona)

    // The fields they want to learn become their gap topics, in the order given.
    await db.transaction(async (trx) => {
      await GapTopic.query({ client: trx }).where('user_id', user.id).delete()
      for (const [position, topic] of input.learningGoals.entries()) {
        await GapTopic.create({ userId: user.id, topic, position }, { client: trx })
      }
    })

    return serialize({ persona })
  }
}
