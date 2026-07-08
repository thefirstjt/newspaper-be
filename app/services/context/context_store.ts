import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import ReaderDocument from '#models/reader_document'
import {
  READER_DOCUMENTS,
  findDocument,
  type ContextDocumentKey,
} from '#services/context/document_registry'

/**
 * Manages one reader's context documents, stored as rows in the
 * `reader_documents` table. Every reader has their own copy, seeded from the
 * committed templates when they sign up; after that the live row is the source
 * of truth and can be edited by the reader or rewritten by the model. A missing
 * row is seeded from its template on first read, so the store is safe to use for
 * a user who has not been through the seeder.
 */
export class ContextStore {
  constructor(private userId: string) {}

  /** Returns a document's content, seeding it from its template the first time. */
  async read(key: ContextDocumentKey): Promise<string> {
    const existing = await ReaderDocument.query()
      .where('user_id', this.userId)
      .where('key', key)
      .first()
    if (existing) {
      return existing.content
    }

    const seed = await this.readTemplate(findDocument(key).filename)
    await ReaderDocument.create({ userId: this.userId, key, content: seed })
    return seed
  }

  /** Overwrites a document's content for this reader. */
  async write(key: ContextDocumentKey, content: string): Promise<void> {
    await ReaderDocument.updateOrCreate({ userId: this.userId, key }, { content })
  }

  /**
   * Builds the "About the reader" section given to the model, combining the
   * injected documents under a heading each. Documents with no real content are
   * skipped so they never leave a dangling heading, and when nothing has content
   * an empty string is returned (so callers can omit the section entirely).
   */
  async assembleReaderContext(): Promise<string> {
    const sections: string[] = []

    for (const document of READER_DOCUMENTS) {
      if (!document.injected) {
        continue
      }
      const stored = await this.read(document.key)
      const content = stored.trim()
      if (!content) {
        continue
      }
      sections.push(`## ${document.title}\n\n${content}`)
    }

    if (sections.length === 0) {
      return ''
    }

    return `# About the reader\n\n${sections.join('\n\n')}`
  }

  private async readTemplate(filename: string): Promise<string> {
    const templatePath = join(app.makePath('resources/context'), filename)
    try {
      return await readFile(templatePath, 'utf-8')
    } catch (error) {
      if (isFileNotFound(error)) {
        throw new Error(`No template found for reader context document at ${templatePath}.`)
      }
      throw error
    }
  }
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
