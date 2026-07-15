import db from '@adonisjs/lucid/services/db'
import Invitation from '#models/invitation'
import User from '#models/user'
import Category from '#models/category'
import Source from '#models/source'
import { seedAccountBasics } from '#services/onboarding/user_seeder'
import { contextStoreFor } from '#services/context/context_store_manager'
import { makeSourceDiscovery } from '#services/onboarding/source_discovery'
import { makeInterestCategorization } from '#services/onboarding/interest_categorization'
import { acceptInvitationValidator, onboardingCategoriesValidator } from '#validators/onboarding'
import { presentCategory } from '#transformers/newspaper_presenter'
import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

// How many items a discovered category surfaces per day, and how deep its pool
// goes — the same defaults the shipped config uses for its categories.
const DEFAULT_MIN = 1
const DEFAULT_MAX = 2
const DEFAULT_POOL_SIZE = 6

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

  /**
   * Stage 3: the reader either names the categories they want or describes their
   * interests in free text (which the model turns into categories). For each
   * category the model then suggests sources whose feeds we verify, keeping only
   * the ones that resolve. Returns the categories with their sources — the
   * stage-4 view. This runs synchronously for now; a future version would queue
   * the discovery per category and notify when it is ready.
   */
  async categories({ auth, request, serialize, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const { categories, interests } = await request.validateUsing(onboardingCategoriesValidator)

    // Resolve the categories to build: the model turns free-text interests into
    // them, otherwise the reader's own list is used.
    let plan: { title: string; description?: string }[]
    if (interests) {
      plan = await makeInterestCategorization().categorize(interests)
    } else if (categories) {
      plan = categories
    } else {
      return response.unprocessableEntity({
        error: 'Provide either a list of categories or your interests.',
      })
    }

    const persona = await contextStoreFor(user.id).read('persona')
    const discovery = makeSourceDiscovery()
    const existing = await Category.query().where('user_id', user.id)
    const takenKeys = new Set(existing.map((category) => category.key))

    const created: Category[] = []
    for (const input of plan) {
      const key = uniqueSlug(input.title, takenKeys)
      takenKeys.add(key)

      const category = await Category.create({
        userId: user.id,
        key,
        title: input.title,
        min: DEFAULT_MIN,
        max: DEFAULT_MAX,
        poolSize: DEFAULT_POOL_SIZE,
        relevanceHint: input.description ?? input.title,
      })

      const sources = await discovery.discoverVerified({
        categoryTitle: category.title,
        relevanceHint: category.relevanceHint,
        persona,
      })
      for (const source of sources) {
        await Source.create({
          userId: user.id,
          categoryId: category.id,
          type: 'rss',
          name: source.name,
          settings: { feedUrl: source.feedUrl },
          enabled: true,
        })
      }

      await category.load('sources')
      created.push(category)
    }

    return serialize({ categories: created.map((category) => presentCategory(category)) })
  }
}

/** Turns a title into a slug unique among the reader's category keys. */
function uniqueSlug(title: string, taken: Set<string>): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'category'

  if (!taken.has(base)) {
    return base
  }
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}
