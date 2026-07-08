import Parser from 'rss-parser'

/** How long to wait for a feed before giving up, so a dead host can't stall us. */
const REQUEST_TIMEOUT_MS = 10_000

type FeedReader = Pick<Parser, 'parseURL'>

/**
 * Checks that RSS/Atom feed urls actually resolve, so suggested sources that
 * point at a dead or wrong address are dropped before they are saved. The parser
 * is injectable so tests can decide which urls "work" without making a network
 * request.
 */
export class FeedVerifier {
  constructor(private parser: FeedReader = new Parser({ timeout: REQUEST_TIMEOUT_MS })) {}

  /** Whether a single feed resolves and has at least one entry. */
  async verify(feedUrl: string): Promise<boolean> {
    try {
      const feed = await this.parser.parseURL(feedUrl)
      return Array.isArray(feed.items) && feed.items.length > 0
    } catch {
      return false
    }
  }

  /**
   * Verifies many feeds with a small concurrency cap (so one slow feed does not
   * hold up the rest) and returns only the ones that work, in their original
   * order.
   */
  async keepWorking(urls: string[], concurrency = 4): Promise<string[]> {
    const results = new Array<boolean>(urls.length)
    let next = 0

    const worker = async () => {
      while (next < urls.length) {
        const index = next
        next += 1
        results[index] = await this.verify(urls[index])
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
    return urls.filter((_, index) => results[index])
  }
}
