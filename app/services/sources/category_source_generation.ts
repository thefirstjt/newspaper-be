import Category from '#models/category'
import Source from '#models/source'
import type User from '#models/user'
import { contextStoreFor } from '#services/context/context_store_manager'
import { makeSourceDiscovery } from '#services/onboarding/source_discovery'
import type { SourceDiscovery } from '#services/onboarding/source_discovery'

/** The Transmit channel a category's background source discovery is announced on. */
export function categorySourcesChannelFor(userId: string, categoryId: number): string {
  return `users/${userId}/categories/${categoryId}/sources`
}

/**
 * Discovers sources for a single category and saves the ones that verify, given
 * the reader's persona (to tailor the suggestions) and a discovery service. Any
 * source the category already has is left alone — matched by type and name — so
 * a retried job tops the category up rather than duplicating what is there. This
 * is the shared heart of source discovery, used both by onboarding (which loops
 * over freshly created categories) and by the background job that runs when a
 * reader adds a category by hand.
 */
export async function discoverAndSaveSources(
  user: User,
  category: Category,
  persona: string,
  discovery: SourceDiscovery
): Promise<void> {
  const discovered = await discovery.discoverVerified({
    categoryTitle: category.title,
    relevanceHint: category.relevanceHint,
    persona,
  })

  const existing = await Source.query().where('category_id', category.id)
  const taken = new Set(existing.map((source) => sourceKey(source.type, source.name)))

  for (const source of discovered) {
    const key = sourceKey(source.type, source.name)
    if (taken.has(key)) continue
    taken.add(key)

    await Source.create({
      userId: user.id,
      categoryId: category.id,
      type: source.type,
      name: source.name,
      settings: source.settings,
      enabled: true,
    })
  }
}

/**
 * Discovers and saves sources for one category the reader already has, reading
 * their persona first. Returns the category with its sources loaded. This is the
 * slow part — an LLM call plus feed checks — so it runs inside a queued job
 * rather than blocking the request that added the category.
 */
export async function generateSourcesForCategory(
  user: User,
  category: Category,
  discovery: SourceDiscovery = makeSourceDiscovery()
): Promise<Category> {
  const persona = await contextStoreFor(user.id).read('persona')
  await discoverAndSaveSources(user, category, persona, discovery)
  await category.load('sources')
  return category
}

/** A source key that ignores casing and stray spacing, matching by type and name. */
function sourceKey(type: string, name: string): string {
  return `${type}\n${name.trim().toLowerCase()}`
}

/**
 * How the endpoint hands a category's source discovery off to run in the
 * background. Behind a swappable factory so the endpoint can be exercised in
 * tests without a real queue (and therefore without Redis).
 */
export interface CategorySourcesDispatcher {
  dispatch(userId: string, categoryId: number): Promise<void>
}

/** The real dispatch: enqueue the job onto the Redis-backed queue. */
class QueuedCategorySources implements CategorySourcesDispatcher {
  async dispatch(userId: string, categoryId: number): Promise<void> {
    const { default: queue } = await import('@rlanz/bull-queue/services/main')
    const { default: GenerateCategorySourcesJob } = await import(
      '#jobs/generate_category_sources_job'
    )
    await queue.dispatch(GenerateCategorySourcesJob, { userId, categoryId })
  }
}

let factory: () => CategorySourcesDispatcher = () => new QueuedCategorySources()

export function makeCategorySourcesDispatcher(): CategorySourcesDispatcher {
  return factory()
}

export function setCategorySourcesDispatcher(next: () => CategorySourcesDispatcher): void {
  factory = next
}

export function resetCategorySourcesDispatcher(): void {
  factory = () => new QueuedCategorySources()
}
