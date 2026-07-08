import { test } from '@japa/runner'
import { FeedVerifier } from '#services/scout/feed_verifier'

/** A parser that resolves for URLs containing "good" and throws otherwise. */
function fakeParser() {
  const parsed: string[] = []
  return {
    parsed,
    parseURL: async (url: string) => {
      parsed.push(url)
      if (url.includes('good')) {
        return { items: [{ title: 'An entry' }] } as any
      }
      throw new Error('could not fetch feed')
    },
  }
}

test.group('FeedVerifier', () => {
  test('verify accepts a feed that resolves with entries', async ({ assert }) => {
    const verifier = new FeedVerifier(fakeParser())
    assert.isTrue(await verifier.verify('https://good.com/feed'))
    assert.isFalse(await verifier.verify('https://dead.com/feed'))
  })

  test('a feed that resolves but is empty is rejected', async ({ assert }) => {
    const verifier = new FeedVerifier({
      parseURL: async () => ({ items: [] }) as any,
    })
    assert.isFalse(await verifier.verify('https://empty.com/feed'))
  })

  test('keepWorking returns only the working feeds, in order', async ({ assert }) => {
    const parser = fakeParser()
    const verifier = new FeedVerifier(parser)

    const kept = await verifier.keepWorking([
      'https://good-1.com/feed',
      'https://dead.com/feed',
      'https://good-2.com/feed',
    ])

    assert.deepEqual(kept, ['https://good-1.com/feed', 'https://good-2.com/feed'])
    assert.lengthOf(parser.parsed, 3)
  })
})
