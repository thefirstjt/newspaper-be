import Category from '#models/category'
import Source from '#models/source'
import type User from '#models/user'
import { contextStoreFor } from '#services/context/context_store_manager'
import { makeSourceDiscovery } from '#services/onboarding/source_discovery'
import { makeInterestCategorization } from '#services/onboarding/interest_categorization'

// How many items a discovered category surfaces per day, and how deep its pool
// goes — the same defaults the shipped config uses for its categories.
const DEFAULT_MIN = 1
const DEFAULT_MAX = 2
const DEFAULT_POOL_SIZE = 6

/**
 * What the reader asked for in stage 3: either a list of categories they named,
 * or free text describing their interests for the model to turn into categories.
 */
export interface CategoryGenerationInput {
  categories?: { title: string; description?: string }[]
  interests?: string
}

/** The Transmit channel a reader's category generation is announced on. */
export function categoriesChannelFor(userId: string): string {
  return `users/${userId}/onboarding/categories`
}

/**
 * The actual work of stage 3, independent of how it is triggered: resolve the
 * categories to build (from free-text interests via the model, or the reader's
 * own list), create each one, discover and verify its sources, and persist the
 * ones whose feeds resolve. Returns the created categories with their sources
 * loaded. This is the slow part — LLM calls plus feed checks — so it runs inside
 * a queued job rather than blocking the request.
 */
export async function generateCategoriesAndSources(
  user: User,
  input: CategoryGenerationInput
): Promise<Category[]> {
  const persona = await contextStoreFor(user.id).read('persona')

  let plan: { title: string; description?: string }[]
  if (input.interests) {
    plan = await makeInterestCategorization().categorize(input.interests, persona)
  } else if (input.categories) {
    plan = input.categories
  } else {
    throw new Error('Category generation needs either a list of categories or interests.')
  }

  const discovery = makeSourceDiscovery()
  const existing = await Category.query().where('user_id', user.id)
  const takenKeys = new Set(existing.map((category) => category.key))

  const created: Category[] = []
  for (const item of plan) {
    const key = uniqueSlug(item.title, takenKeys)
    takenKeys.add(key)

    const category = await Category.create({
      userId: user.id,
      key,
      title: item.title,
      min: DEFAULT_MIN,
      max: DEFAULT_MAX,
      poolSize: DEFAULT_POOL_SIZE,
      relevanceHint: item.description ?? item.title,
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
        type: source.type,
        name: source.name,
        settings: source.settings,
        enabled: true,
      })
    }

    await category.load('sources')
    created.push(category)
  }

  return created
}

/**
 * How the endpoint hands category generation off to run in the background.
 * Behind a swappable factory so the endpoint can be exercised in tests without a
 * real queue (and therefore without Redis).
 */
export interface CategoryGenerationDispatcher {
  dispatch(userId: string, input: CategoryGenerationInput): Promise<void>
}

/** The real dispatch: enqueue the job onto the Redis-backed queue. */
class QueuedCategoryGeneration implements CategoryGenerationDispatcher {
  async dispatch(userId: string, input: CategoryGenerationInput): Promise<void> {
    const { default: queue } = await import('@rlanz/bull-queue/services/main')
    const { default: GenerateCategoriesJob } = await import('#jobs/generate_categories_job')
    await queue.dispatch(GenerateCategoriesJob, { userId, input })
  }
}

let factory: () => CategoryGenerationDispatcher = () => new QueuedCategoryGeneration()

export function makeCategoryGenerationDispatcher(): CategoryGenerationDispatcher {
  return factory()
}

export function setCategoryGenerationDispatcher(next: () => CategoryGenerationDispatcher): void {
  factory = next
}

export function resetCategoryGenerationDispatcher(): void {
  factory = () => new QueuedCategoryGeneration()
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
