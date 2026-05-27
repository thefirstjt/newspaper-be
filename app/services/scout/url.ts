import { createHash } from 'node:crypto'

const TRACKING_PARAMS = ['fbclid', 'gclid', 'mc_cid', 'mc_eid']

/**
 * Normalises a url so the same story fetched from different places dedupes to
 * one entry: it drops the fragment and common tracking parameters, lowercases
 * the host, and trims a trailing slash. A url that cannot be parsed is returned
 * trimmed and otherwise untouched.
 */
export function canonicalizeUrl(input: string): string {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return input.trim()
  }

  url.hash = ''
  url.hostname = url.hostname.toLowerCase()

  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || TRACKING_PARAMS.includes(key)) {
      url.searchParams.delete(key)
    }
  }

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }

  return url.toString()
}

/** A stable hash of a canonical url, used as the dedup and seen-url key. */
export function hashUrl(canonicalUrl: string): string {
  return createHash('sha256').update(canonicalUrl).digest('hex')
}
