import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  createMoldableHeadlessEditor,
  markdownTransformers,
} from '@moldable/editor'
import { $isCodeNode } from '@lexical/code'
import { $isLinkNode } from '@lexical/link'
import { $isListItemNode } from '@lexical/list'
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text'
import {
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  $getNodeByKey as $lexicalGetNodeByKey,
  ElementNode,
  LexicalEditor,
  LexicalNode,
} from 'lexical'

/**
 * A block (paragraph, heading, etc.) ready for translation
 */
export interface TranslatableBlock {
  /** The block node's key */
  nodeKey: string
  /** XML string with text wrapped in <x id="nodeKey"> tags */
  xml: string
  /** Map of text node keys to their format info */
  formatMap: Map<string, number>
  /** Original node keys in order (for rebuilding if order changes) */
  nodeOrder: string[]
}

/**
 * Represents the document structure - either a content block or empty paragraph
 */
export type StructureEntry =
  | { type: 'block'; blockIndex: number; nodeKey: string }
  | { type: 'empty'; nodeKey: string }

/**
 * Result of extracting translatable blocks, including document structure
 */
export interface ExtractionResult {
  blocks: TranslatableBlock[]
  /** Document structure - preserves order of content blocks and empty paragraphs */
  structure: StructureEntry[]
}

/**
 * Extract translatable blocks from the editor.
 * Each block's text nodes are wrapped in XML tags with their node keys as IDs.
 * Also returns the document structure to preserve empty paragraphs.
 */
export function $extractTranslatableBlocks(
  _editor: LexicalEditor,
): ExtractionResult {
  const blocks: TranslatableBlock[] = []
  const structure: StructureEntry[] = []
  const root = $getRoot()

  function processBlockNode(node: ElementNode): TranslatableBlock | null {
    const formatMap = new Map<string, number>()
    const nodeOrder: string[] = []
    let xml = ''

    function processChildren(parent: LexicalNode): void {
      if ($isTextNode(parent)) {
        const key = parent.getKey()
        const text = parent.getTextContent()
        const format = parent.getFormat()

        formatMap.set(key, format)
        nodeOrder.push(key)
        xml += `<x id="${key}">${escapeXml(text)}</x>`
      } else if ($isLinkNode(parent)) {
        // For links, wrap the whole link content but track inner text nodes
        const href = parent.getURL()
        const linkKey = parent.getKey()
        xml += `<a href="${escapeXml(href)}" id="${linkKey}">`
        for (const child of parent.getChildren()) {
          processChildren(child)
        }
        xml += '</a>'
      } else if ($isElementNode(parent)) {
        for (const child of parent.getChildren()) {
          processChildren(child)
        }
      }
    }

    processChildren(node)

    // Skip empty blocks
    if (!xml.trim() || nodeOrder.length === 0) {
      return null
    }

    return {
      nodeKey: node.getKey(),
      xml,
      formatMap,
      nodeOrder,
    }
  }

  function walkTree(node: LexicalNode): void {
    // Skip code blocks - don't translate code
    if ($isCodeNode(node)) {
      return
    }

    // Check for empty paragraph first
    if ($isParagraphNode(node) && !node.getTextContent().trim()) {
      structure.push({ type: 'empty', nodeKey: node.getKey() })
      return
    }

    // These are our translatable block types
    if (
      $isParagraphNode(node) ||
      $isHeadingNode(node) ||
      $isQuoteNode(node) ||
      $isListItemNode(node)
    ) {
      const block = processBlockNode(node as ElementNode)
      if (block) {
        structure.push({
          type: 'block',
          blockIndex: blocks.length,
          nodeKey: node.getKey(),
        })
        blocks.push(block)
      }
      return
    }

    // For lists and other containers, recurse into children
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        walkTree(child)
      }
    }
  }

  for (const child of root.getChildren()) {
    walkTree(child)
  }

  return { blocks, structure }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Parse translated XML response, extracting text by node ID.
 * Returns a map of nodeKey -> translated text, plus the new order of nodes.
 */
export function parseTranslatedXml(xml: string): {
  translations: Map<string, string>
  newOrder: string[]
} {
  const translations = new Map<string, string>()
  const newOrder: string[] = []

  // Simple regex-based parser for our known XML structure
  // Matches <x id="...">content</x> and <a href="..." id="...">...</a>
  const tagRegex = /<x id="([^"]+)">([^<]*)<\/x>/g
  let match

  while ((match = tagRegex.exec(xml)) !== null) {
    const id = match[1]
    const content = match[2]
    if (id && content !== undefined) {
      translations.set(id, unescapeXml(content))
      newOrder.push(id)
    }
  }

  return { translations, newOrder }
}

function unescapeXml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

/**
 * Apply translations to a block node.
 * Rebuilds the text nodes with translated content, preserving original formatting.
 */
export function $applyBlockTranslation(
  blockNode: ElementNode,
  translations: Map<string, string>,
  formatMap: Map<string, number>,
  newOrder: string[],
): void {
  // Clear existing children
  blockNode.clear()

  // Rebuild in the new order with translated text and original formatting
  for (const nodeKey of newOrder) {
    const translatedText = translations.get(nodeKey)
    const format = formatMap.get(nodeKey) ?? 0

    if (translatedText !== undefined) {
      const textNode = $createTextNode(translatedText)
      textNode.setFormat(format)
      blockNode.append(textNode)
    }
  }
}

/**
 * Get a node by its key from the editor
 */
export function $getNodeByKey(key: string): LexicalNode | null {
  return $lexicalGetNodeByKey(key)
}

// ============================================================================
// Legacy exports for backwards compatibility (tests may use these)
// ============================================================================

export interface TranslatableSegment {
  nodeKey: string
  text: string
  type: string
}

/** @deprecated Use $extractTranslatableBlocks instead */
export function $extractTranslatableSegments(): TranslatableSegment[] {
  const segments: TranslatableSegment[] = []
  const root = $getRoot()

  function extractFromNode(node: LexicalNode): void {
    if ($isTextNode(node)) {
      const text = node.getTextContent()
      if (text.trim()) {
        segments.push({
          nodeKey: node.getKey(),
          text: text,
          type: 'text',
        })
      }
    } else if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        extractFromNode(child)
      }
    }
  }

  for (const child of root.getChildren()) {
    extractFromNode(child)
  }

  return segments
}

/** @deprecated */
export function $applyTranslations(translations: Map<string, string>): void {
  const root = $getRoot()

  function applyToNode(node: LexicalNode): void {
    if ($isTextNode(node)) {
      const translation = translations.get(node.getKey())
      if (translation !== undefined) {
        node.setTextContent(translation)
      }
    } else if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        applyToNode(child)
      }
    }
  }

  for (const child of root.getChildren()) {
    applyToNode(child)
  }
}

/** @deprecated */
export function $getTextSegmentsForTranslation(): {
  texts: string[]
  nodeKeys: string[]
} {
  const texts: string[] = []
  const nodeKeys: string[] = []
  const root = $getRoot()

  function processNode(node: LexicalNode): void {
    if ($isTextNode(node)) {
      texts.push(node.getTextContent())
      nodeKeys.push(node.getKey())
    } else if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        processNode(child)
      }
    }
  }

  for (const child of root.getChildren()) {
    processNode(child)
  }

  return { texts, nodeKeys }
}

/** @deprecated Use block-level translation */
export async function translateEditorState(
  editor: LexicalEditor,
  translateFn: (texts: string[]) => Promise<string[]>,
): Promise<string> {
  const segments = await new Promise<TranslatableSegment[]>((resolve) => {
    editor.getEditorState().read(() => {
      resolve($extractTranslatableSegments())
    })
  })

  if (segments.length === 0) {
    return ''
  }

  const textsToTranslate = segments.map((s) => s.text)
  const translations = await translateFn(textsToTranslate)

  const translationsByIndex = new Map<number, string>()
  translations.forEach((translation, index) => {
    translationsByIndex.set(index, translation)
  })

  const translatedEditor = createMoldableHeadlessEditor()

  const originalMarkdown = await new Promise<string>((resolve) => {
    editor.getEditorState().read(() => {
      resolve($convertToMarkdownString({ transformers: markdownTransformers }))
    })
  })

  await new Promise<void>((resolve) => {
    translatedEditor.update(() => {
      $convertFromMarkdownString({
        markdown: originalMarkdown,
        transformers: markdownTransformers,
      })
      resolve()
    })
  })

  await new Promise<void>((resolve) => {
    translatedEditor.update(() => {
      let index = 0
      const root = $getRoot()

      function applyToNode(node: LexicalNode): void {
        if ($isTextNode(node)) {
          const translation = translationsByIndex.get(index)
          if (translation !== undefined) {
            node.setTextContent(translation)
          }
          index++
        } else if ($isElementNode(node)) {
          for (const child of node.getChildren()) {
            applyToNode(child)
          }
        }
      }

      for (const child of root.getChildren()) {
        applyToNode(child)
      }
      resolve()
    })
  })

  return new Promise<string>((resolve) => {
    translatedEditor.getEditorState().read(() => {
      resolve($convertToMarkdownString({ transformers: markdownTransformers }))
    })
  })
}
