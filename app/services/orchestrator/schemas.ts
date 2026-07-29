import { z } from 'zod'

/**
 * Schemas for the structured output the models must return. They are kept apart
 * from the prompts and the calling code so the exact shape of each task's output
 * lives in one place.
 */

export const rankingSchema = z.object({
  rankings: z.array(
    z.object({
      id: z.number().int(),
      score: z.number(),
      reason: z.string(),
    })
  ),
})

export const quizSchema = z.object({
  questions: z.array(
    z.object({
      topic: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int(),
      explanation: z.string(),
    })
  ),
})

export const editionHeadlineSchema = z.object({
  headline: z.string(),
  summary: z.string(),
})

export const sourceDiscoverySchema = z.object({
  feeds: z.array(
    z.object({
      name: z.string(),
      // A plain string rather than a url()-validated field: strict structured
      // output rejects the "uri" format that url() emits, and every feed is
      // verified afterwards anyway, so bad urls are dropped then.
      feedUrl: z.string().describe('The full URL of the RSS or Atom feed.'),
    })
  ),
  channels: z.array(
    z.object({
      name: z.string(),
      channelUrl: z
        .string()
        .describe('The full URL of the YouTube channel — its @handle or /channel/ address.'),
    })
  ),
})

export const interestCategoriesSchema = z.object({
  categories: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
})
