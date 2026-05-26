import env from '#start/env'

/**
 * A single place from which the system discovers content for a category. Every
 * source has a type that decides how it is read, and a `settings` bag that
 * holds the details specific to that type (for example the feed url for RSS, or
 * the channel id for YouTube).
 */
export type SourceType = 'rss' | 'youtube' | 'websearch'

export interface SourceConfig {
  type: SourceType
  name: string
  settings: {
    /** RSS/Atom feed url, for `rss` sources. */
    feedUrl?: string
    /** YouTube channel id, for `youtube` sources. */
    channelId?: string
    /** A topic or query hint that guides the search, for `websearch` sources. */
    query?: string
  }
}

/**
 * A category is one section of the newspaper. It groups a set of sources and
 * says how many items should be surfaced from them each day. Categories are
 * defined entirely here as data, so a new section can be added without touching
 * any code. The "key learning" and "quiz" sections are built in separately and
 * are not categories.
 */
export interface CategoryConfig {
  /** Stable identifier used in the database and the API, e.g. 'eng-blogs'. */
  key: string
  /** Human-friendly title shown in the edition, e.g. 'Engineering Blogs'. */
  title: string
  /** Fewest items to surface from this category in a day. */
  min: number
  /** Most items to surface from this category in a day. */
  max: number
  /**
   * How many ranked candidates to keep in reserve for the day. When an item is
   * discarded the next reserve is revealed, so a larger pool means more chances
   * to find something you like before running out.
   */
  poolSize: number
  /**
   * Plain-language guidance describing what makes an item relevant to you for
   * this category. It is given to the model when it ranks candidates.
   */
  relevanceHint: string
  sources: SourceConfig[]
}

export interface NewspaperConfig {
  /** The sections of the newspaper and where each one gets its content. */
  categories: CategoryConfig[]
  /**
   * The learning gaps the key learning and quiz should focus on. The model
   * picks a subtopic from this list each day.
   */
  gapTopics: string[]
  /** How many quiz questions to generate each day (within this range). */
  quiz: { min: number; max: number }
  /** When the daily pipeline runs and whether the edition is emailed. */
  schedule: {
    runTime: string
    emailEnabled: boolean
  }
  /** Which language model provider powers ranking and generation. */
  llm: {
    provider: 'anthropic' | 'openai'
  }
}

const newspaperConfig: NewspaperConfig = {
  categories: [
    {
      key: 'eng-blogs',
      title: 'Engineering Blogs, Podcasts & Talks',
      min: 1,
      max: 2,
      poolSize: 6,
      relevanceHint:
        'Deep, thoughtful engineering writing and talks that make a senior ' +
        'software engineer think: system design, building data-intensive ' +
        'applications, architecting AI integrations, and how large real-world ' +
        'systems actually work. Favour substance over shallow news.',
      sources: [
        {
          type: 'rss',
          name: 'Stripe Engineering Blog',
          settings: { feedUrl: 'https://stripe.com/blog/feed.rss' },
        },
        {
          type: 'rss',
          name: 'Shopify Engineering Blog',
          settings: { feedUrl: 'https://shopify.engineering/blog.atom' },
        },
        {
          type: 'rss',
          name: 'Anthropic Engineering Blog',
          settings: {
            feedUrl:
              'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_engineering.xml',
          },
        },
        {
          type: 'rss',
          name: 'OpenAI Engineering',
          settings: { feedUrl: 'https://openai.com/news/engineering/rss.xml' },
        },
        {
          type: 'rss',
          name: 'Spotify Engineering',
          settings: { feedUrl: 'https://engineering.atspotify.com/feed' },
        },
        {
          type: 'rss',
          name: 'Airbnb Engineering',
          settings: { feedUrl: 'https://medium.com/feed/airbnb-engineering' },
        },
        {
          type: 'rss',
          name: 'Netflix Tech Blog',
          settings: { feedUrl: 'https://netflixtechblog.com/feed' },
        },
        {
          type: 'rss',
          name: 'The Pragmatic Engineer',
          settings: { feedUrl: 'https://newsletter.pragmaticengineer.com/feed' },
        },
      ],
    },
    {
      key: 'thought-pieces',
      title: 'Thought Pieces from Experienced Engineers',
      min: 1,
      max: 2,
      poolSize: 6,
      relevanceHint:
        'Reflective, opinionated essays from seasoned engineers and engineering ' +
        'leaders on craft, judgement, careers, leadership and how to think about ' +
        'building software. Favour pieces that leave you with a new perspective ' +
        'rather than news or tutorials.',
      sources: [
        {
          type: 'rss',
          name: 'Grant Slatton',
          settings: { feedUrl: 'https://grantslatton.com/rss.xml' },
        },
        {
          type: 'rss',
          name: 'Rands in Repose',
          settings: { feedUrl: 'https://randsinrepose.com/feed/' },
        },
      ],
    },
    {
      key: 'global-ai-news',
      title: 'Global AI & Tech News',
      min: 1,
      max: 2,
      poolSize: 6,
      relevanceHint:
        'Valuable AI and technology news from mainstream global outlets, told ' +
        'from a general audience perspective rather than a deeply technical ' +
        'one. The goal is to keep abreast of how the wider world sees and ' +
        'talks about AI and tech.',
      sources: [
        {
          type: 'rss',
          name: 'CNN Technology',
          settings: { feedUrl: 'http://rss.cnn.com/rss/edition_technology.rss' },
        },
        {
          type: 'rss',
          name: 'The Guardian Technology',
          settings: { feedUrl: 'https://www.theguardian.com/uk/technology/rss' },
        },
        {
          type: 'websearch',
          name: 'Global AI headlines',
          settings: {
            query: 'most significant artificial intelligence news today from major news outlets',
          },
        },
      ],
    },
    {
      key: 'nigeria-ai-news',
      title: 'Nigerian AI & Tech News',
      min: 1,
      max: 2,
      poolSize: 6,
      relevanceHint:
        'AI and technology stories from mainstream Nigerian news outlets (the ' +
        'general newspapers people actually read, such as Punch and Guardian ' +
        'Nigeria), not Nigerian tech blogs. The goal is a feel for how ordinary ' +
        'Nigerians see and perceive AI.',
      sources: [
        {
          type: 'rss',
          name: 'Punch',
          settings: { feedUrl: 'https://rss.punchng.com/v1/category/technology' },
        },
        {
          type: 'rss',
          name: 'The Guardian Nigeria',
          settings: { feedUrl: 'https://guardian.ng/category/technology/feed/' },
        },
        {
          type: 'websearch',
          name: 'Nigerian AI headlines',
          settings: {
            query:
              'artificial intelligence news from Nigerian mainstream newspapers such as Punch, Guardian Nigeria, Vanguard, ThisDay',
          },
        },
      ],
    },
  ],

  gapTopics: [
    'building data-intensive applications',
    'architecting AI integrations into software systems',
    'system design of large-scale distributed systems',
  ],

  quiz: { min: 1, max: 2 },

  schedule: {
    runTime: env.get('NEWSPAPER_RUN_TIME', '21:00'),
    emailEnabled: env.get('EMAIL_ENABLED', true),
  },

  llm: {
    provider: env.get('LLM_PROVIDER', 'anthropic'),
  },
}

export default newspaperConfig
