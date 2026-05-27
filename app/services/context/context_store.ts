import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  READER_DOCUMENTS,
  findDocument,
  type ContextDocumentKey,
} from '#services/context/document_registry'

/**
 * Manages the reader-context documents on disk. Each document has a committed
 * default template; the first time a document is read its template is copied
 * into the live directory, after which the live copy is the source of truth and
 * can be edited by the reader or rewritten by the model.
 *
 * Both directories are injected so the store can be pointed at temporary
 * locations in tests.
 */
export class ContextStore {
  constructor(
    private liveDir: string,
    private templateDir: string
  ) {}

  /**
   * Returns a document's live content, seeding it from the template the first
   * time (and writing that seed to the live directory) when no live copy exists.
   */
  async read(key: ContextDocumentKey): Promise<string> {
    const document = findDocument(key)
    const livePath = join(this.liveDir, document.filename)

    try {
      return await readFile(livePath, 'utf-8')
    } catch (error) {
      if (!isFileNotFound(error)) {
        throw error
      }
    }

    const seed = await this.readTemplate(document.filename)
    await this.writeLive(document.filename, seed)
    return seed
  }

  /** Overwrites a document's live content. */
  async write(key: ContextDocumentKey, content: string): Promise<void> {
    const document = findDocument(key)
    await this.writeLive(document.filename, content)
  }

  /**
   * Ensures every registered document has a live copy, seeding any that are
   * missing from their templates. Safe to run repeatedly.
   */
  async seed(): Promise<{ seeded: string[]; existing: string[] }> {
    const seeded: string[] = []
    const existing: string[] = []

    for (const document of READER_DOCUMENTS) {
      const livePath = join(this.liveDir, document.filename)
      try {
        await readFile(livePath, 'utf-8')
        existing.push(document.filename)
      } catch (error) {
        if (!isFileNotFound(error)) {
          throw error
        }
        const seed = await this.readTemplate(document.filename)
        await this.writeLive(document.filename, seed)
        seeded.push(document.filename)
      }
    }

    return { seeded, existing }
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
    const templatePath = join(this.templateDir, filename)
    try {
      return await readFile(templatePath, 'utf-8')
    } catch (error) {
      if (isFileNotFound(error)) {
        throw new Error(`No template found for reader context document at ${templatePath}.`)
      }
      throw error
    }
  }

  private async writeLive(filename: string, content: string): Promise<void> {
    await mkdir(this.liveDir, { recursive: true })
    await writeFile(join(this.liveDir, filename), content, 'utf-8')
  }
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
