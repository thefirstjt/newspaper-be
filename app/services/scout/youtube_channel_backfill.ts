import logger from '@adonisjs/core/services/logger'
import Source from '#models/source'
import {
  makeYoutubeChannelResolver,
  isYoutubeChannelId,
  type YoutubeChannelResolver,
} from '#services/scout/youtube_channel_resolver'
import type { SourceConfig } from '#config/newspaper'

/**
 * Resolves a proper channel id for any youtube source that does not have one yet,
 * so a reader never has to re-add a source. This covers two legacy shapes: the
 * newer `channelUrl` field left unresolved, and older sources that stored the
 * channel url directly in `channelId`. Each source is resolved and saved on its
 * own; one that can't be resolved is logged and left for a later run (which picks
 * it up once its url or the API key is sorted). Returns how many were backfilled.
 */
export async function backfillYoutubeChannelIds(
  resolver: YoutubeChannelResolver = makeYoutubeChannelResolver()
): Promise<number> {
  const sources = await Source.query().where('type', 'youtube')
  let backfilled = 0

  for (const source of sources) {
    const url = pendingChannelUrl(source.settings)
    if (!url) continue

    try {
      const resolvedId = await resolver.resolve(url)
      // Store the real id, and keep the url in channelUrl (normalising the older
      // sources that had it sitting in channelId).
      source.settings = { ...source.settings, channelUrl: url, channelId: resolvedId }
      await source.save()
      backfilled += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn({ sourceId: source.id, url }, `Could not backfill youtube channel id: ${message}`)
    }
  }

  return backfilled
}

/**
 * The channel url still needing resolution for a source, or null if it already
 * has a real channel id. Prefers the explicit `channelUrl`, falling back to a
 * `channelId` that is actually a url (how older sources stored it).
 */
function pendingChannelUrl(settings: SourceConfig['settings']): string | null {
  const { channelUrl, channelId } = settings
  if (channelId && isYoutubeChannelId(channelId)) return null
  return channelUrl ?? channelId ?? null
}
