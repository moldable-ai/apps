import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  createMoldableHeadlessEditor,
  markdownTransformers,
} from '@moldable/editor'
import {
  $applyBlockTranslation,
  $extractTranslatableBlocks,
  ExtractionResult,
  StructureEntry,
  TranslatableBlock,
  parseTranslatedXml,
} from './lexical-translation'
import { createHash } from 'crypto'
import {
  $createTextNode,
  $getNodeByKey,
  ElementNode,
  LexicalEditor,
} from 'lexical'

export interface TranslationResult {
  translatedText: string
}

export interface TranslationError {
  error: string
  code: 'MISSING_API_KEY' | 'VALIDATION_ERROR' | 'API_ERROR' | 'INTERNAL_ERROR'
}

/**
 * A block with its content hash for cache lookup.
 */
export interface BlockWithHash extends TranslatableBlock {
  /** SHA-256 hash of the block's plain text content */
  contentHash: string
  /** The plain text content (for reference) */
  plainText: string
}

/**
 * Generate a hash for cache key from text content.
 */
function hashContent(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

/**
 * Extract blocks from markdown with content hashes for cache lookup.
 * Returns the editor instance so we can apply translations to the same instance.
 */
export async function extractBlocksWithHashes(markdown: string): Promise<{
  blocks: BlockWithHash[]
  structure: StructureEntry[]
  editor: LexicalEditor
} | null> {
  if (!markdown.trim()) {
    return null
  }

  const editor = createMoldableHeadlessEditor()

  await new Promise<void>((resolve) => {
    editor.update(() => {
      $convertFromMarkdownString({
        markdown,
        transformers: markdownTransformers,
        shouldPreserveNewLines: true,
      })
      resolve()
    })
  })

  const extraction = await new Promise<ExtractionResult>((resolve) => {
    editor.getEditorState().read(() => {
      resolve($extractTranslatableBlocks(editor))
    })
  })

  if (extraction.blocks.length === 0) {
    return null
  }

  // Add content hashes to blocks
  const blocksWithHashes: BlockWithHash[] = extraction.blocks.map((block) => {
    // Extract plain text from the XML for hashing
    const plainText = block.xml.replace(/<[^>]+>/g, '')
    return {
      ...block,
      contentHash: hashContent(plainText),
      plainText,
    }
  })

  return {
    blocks: blocksWithHashes,
    structure: extraction.structure,
    editor,
  }
}

/**
 * Extract blocks from markdown as XML with node key tracking.
 * Returns the editor instance so we can apply translations to the same instance.
 * Also returns an `xml` string for backward compatibility.
 */
export async function markdownToTranslatableXml(markdown: string): Promise<{
  xml: string
  blocks: BlockWithHash[]
  structure: StructureEntry[]
  editor: LexicalEditor
} | null> {
  const extracted = await extractBlocksWithHashes(markdown)
  if (!extracted) return null

  // Build XML payload for DeepL
  const xml = extracted.blocks
    .map((b, i) => `<block id="${i}">${b.xml}</block>`)
    .join('')

  return {
    xml,
    ...extracted,
  }
}

// Unique marker for empty paragraphs that won't appear in normal text
const EMPTY_PARA_MARKER = 'EMPTYPARA7x9k2m'

/**
 * Parse XML string into a Map of block index → translated XML content.
 */
function parseXmlToMap(translatedXml: string): Map<number, string> {
  const blockRegex = /<block id="(\d+)">([\s\S]*?)<\/block>/g
  const translatedBlocks = new Map<number, string>()
  let match

  while ((match = blockRegex.exec(translatedXml)) !== null) {
    const blockIdStr = match[1]
    const blockContent = match[2]
    if (blockIdStr && blockContent !== undefined) {
      translatedBlocks.set(parseInt(blockIdStr, 10), blockContent)
    }
  }

  return translatedBlocks
}

/**
 * Apply translated XML back to the editor, then export to markdown.
 * MUST use the same editor instance that was used for extraction.
 * Uses the structure to preserve empty paragraphs as <br> tags.
 *
 * @param translatedBlocks - Either a Map of block index → translated XML, or an XML string
 * @param originalBlocks - The original blocks from extraction
 * @param structure - Document structure for preserving empty paragraphs
 * @param editor - The same editor instance used for extraction
 */
export async function applyTranslatedXml(
  translatedBlocks: Map<number, string> | string,
  originalBlocks: TranslatableBlock[],
  structure: StructureEntry[],
  editor: LexicalEditor,
): Promise<string> {
  // Accept either Map or XML string for backward compatibility
  const translatedBlocksMap =
    typeof translatedBlocks === 'string'
      ? parseXmlToMap(translatedBlocks)
      : translatedBlocks
  // Apply translations and add markers to empty paragraphs
  await new Promise<void>((resolve) => {
    editor.update(() => {
      // Apply translations to content blocks
      originalBlocks.forEach((block, index) => {
        const translatedBlockXml = translatedBlocksMap.get(index)
        if (!translatedBlockXml) return

        const { translations, newOrder } =
          parseTranslatedXml(translatedBlockXml)

        const blockNode = $getNodeByKey(block.nodeKey)
        if (blockNode && 'clear' in blockNode) {
          $applyBlockTranslation(
            blockNode as ElementNode,
            translations,
            block.formatMap,
            newOrder,
          )
        }
      })

      // Add marker text to empty paragraphs so they appear in the export
      for (const entry of structure) {
        if (entry.type === 'empty') {
          const node = $getNodeByKey(entry.nodeKey)
          if (node && 'append' in node) {
            ;(node as ElementNode).append($createTextNode(EMPTY_PARA_MARKER))
          }
        }
      }

      resolve()
    })
  })

  // Export to markdown
  const markdown = await new Promise<string>((resolve) => {
    editor.getEditorState().read(() => {
      resolve(
        $convertToMarkdownString({
          transformers: markdownTransformers,
          shouldPreserveNewLines: false,
        }),
      )
    })
  })

  // Replace markers with <br> tags
  return markdown.replace(new RegExp(EMPTY_PARA_MARKER, 'g'), '<br>')
}

/**
 * Call DeepL API with XML content.
 */
export async function callDeepL(
  xml: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
  apiUrl = 'https://api-free.deepl.com',
): Promise<string> {
  const response = await fetch(`${apiUrl}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [xml],
      source_lang: sourceLang.toUpperCase(),
      target_lang: targetLang.toUpperCase(),
      tag_handling: 'xml',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepL API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.translations?.[0]?.text || ''
}

/**
 * Full translation pipeline: markdown → XML → DeepL → markdown
 */
export async function translateMarkdown(
  markdown: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
  apiUrl?: string,
): Promise<string> {
  // Extract translatable blocks
  const extracted = await markdownToTranslatableXml(markdown)

  if (!extracted) {
    return markdown // Nothing to translate
  }

  // Call DeepL
  const translatedXml = await callDeepL(
    extracted.xml,
    sourceLang,
    targetLang,
    apiKey,
    apiUrl,
  )

  // Apply translations to the SAME editor instance
  return applyTranslatedXml(
    translatedXml,
    extracted.blocks,
    extracted.structure,
    extracted.editor,
  )
}
