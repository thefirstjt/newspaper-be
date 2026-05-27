import { test } from '@japa/runner'
import { canonicalizeUrl, hashUrl } from '#services/scout/url'

test.group('canonicalizeUrl', () => {
  test('drops tracking params, fragments, and a trailing slash', ({ assert }) => {
    const canonical = canonicalizeUrl(
      'https://Example.com/story/?utm_source=x&id=7&fbclid=abc#section'
    )
    assert.equal(canonical, 'https://example.com/story?id=7')
  })

  test('leaves the root path slash alone', ({ assert }) => {
    assert.equal(canonicalizeUrl('https://example.com/'), 'https://example.com/')
  })

  test('returns an unparseable url trimmed', ({ assert }) => {
    assert.equal(canonicalizeUrl('  not a url  '), 'not a url')
  })
})

test.group('hashUrl', () => {
  test('is stable for the same url and differs for others', ({ assert }) => {
    assert.equal(hashUrl('https://example.com/a'), hashUrl('https://example.com/a'))
    assert.notEqual(hashUrl('https://example.com/a'), hashUrl('https://example.com/b'))
  })
})
