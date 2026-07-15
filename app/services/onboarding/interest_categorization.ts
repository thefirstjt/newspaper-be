import { InterestCategorizer } from '#services/orchestrator/interest_categorizer'
import type { CategoryPlan } from '#services/orchestrator/interest_categorizer'

/**
 * Turns a reader's free-text interests into categories. Behind a swappable
 * factory so the onboarding endpoint can be exercised in tests without a real
 * model.
 */
export interface InterestCategorization {
  categorize(interests: string, persona?: string): Promise<CategoryPlan[]>
}

let factory: () => InterestCategorization = () => new InterestCategorizer()

export function makeInterestCategorization(): InterestCategorization {
  return factory()
}

export function setInterestCategorization(next: () => InterestCategorization): void {
  factory = next
}

export function resetInterestCategorization(): void {
  factory = () => new InterestCategorizer()
}
