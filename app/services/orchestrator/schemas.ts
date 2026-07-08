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

export const sourceDiscoverySchema = z.object({
  sources: z.array(
    z.object({
      name: z.string(),
      feedUrl: z.string().url(),
    })
  ),
})
