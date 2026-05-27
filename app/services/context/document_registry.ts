/**
 * The living documents that describe the reader. Each one is a markdown file
 * that ships with a default template and is then kept up to date over time —
 * some by the reader (the persona), others rewritten by the model as it learns.
 *
 * Adding a new context document is a matter of adding an entry here and a
 * matching template under resources/context/; the store and assembly logic pick
 * it up automatically.
 */
export type ContextDocumentKey = 'persona' | 'preferences' | 'learning-focus'

export interface ContextDocument {
  key: ContextDocumentKey
  /** The markdown file name, used in both the template and live directories. */
  filename: string
  /** The heading this document appears under when assembled into a prompt. */
  title: string
  /** Whether this document is included in the reader context given to the model. */
  injected: boolean
  /** Whether the model may rewrite this document as it learns about the reader. */
  llmUpdatable: boolean
  /** A short note on what the document holds, used when asking the model to revise it. */
  description: string
}

export const READER_DOCUMENTS: ContextDocument[] = [
  {
    key: 'persona',
    filename: 'persona.md',
    title: 'Who the reader is',
    injected: true,
    llmUpdatable: false,
    description: "The reader's role, interests, and what they want from the newspaper.",
  },
  {
    key: 'preferences',
    filename: 'preferences.md',
    title: 'What the reader likes and dislikes',
    injected: true,
    llmUpdatable: true,
    description:
      "The reader's evolving tastes — the topics, sources, styles, and depth they " +
      'gravitate towards, and the things they pass on.',
  },
  {
    key: 'learning-focus',
    filename: 'learning-focus.md',
    title: "The reader's learning focus",
    injected: true,
    llmUpdatable: true,
    description:
      'What the reader is working on and where they tend to struggle, drawn from ' +
      'their quiz performance and learning-gap topics.',
  },
]

/** Looks up a document by key, throwing if the key is not registered. */
export function findDocument(key: ContextDocumentKey): ContextDocument {
  const document = READER_DOCUMENTS.find((candidate) => candidate.key === key)
  if (!document) {
    throw new Error(`Unknown reader context document: "${key}".`)
  }
  return document
}
