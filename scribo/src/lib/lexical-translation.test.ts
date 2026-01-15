import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  createMoldableHeadlessEditor,
  markdownTransformers,
} from '@moldable-ai/editor'
import {
  $applyBlockTranslation,
  $extractTranslatableBlocks,
  // Legacy
  $extractTranslatableSegments,
  TranslatableBlock,
  TranslatableSegment,
  parseTranslatedXml,
  translateEditorState,
} from './lexical-translation'
import { $getNodeByKey, ElementNode } from 'lexical'
import { describe, expect, it } from 'vitest'

describe('XML-based Translation', () => {
  describe('$extractTranslatableBlocks', () => {
    it('extracts a simple paragraph as XML with node keys', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({ markdown: 'Hello world' })
          resolve()
        })
      })

      const { blocks } = await new Promise<{ blocks: TranslatableBlock[] }>(
        (resolve) => {
          editor.getEditorState().read(() => {
            resolve($extractTranslatableBlocks(editor))
          })
        },
      )

      expect(blocks).toHaveLength(1)
      expect(blocks[0]!.xml).toMatch(/<x id="[^"]+">Hello world<\/x>/)
      expect(blocks[0]!.nodeOrder).toHaveLength(1)
    })

    it('extracts formatted text with separate nodes', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({
            markdown: 'This is **bold** text',
          })
          resolve()
        })
      })

      const { blocks } = await new Promise<{ blocks: TranslatableBlock[] }>(
        (resolve) => {
          editor.getEditorState().read(() => {
            resolve($extractTranslatableBlocks(editor))
          })
        },
      )

      expect(blocks).toHaveLength(1)
      // Should have 3 text nodes: "This is ", "bold", " text"
      expect(blocks[0]!.nodeOrder.length).toBeGreaterThanOrEqual(2)
      // XML should contain all parts
      expect(blocks[0]!.xml).toContain('bold')
      // Format map should have bold format (1) for one node
      const formats = Array.from(blocks[0]!.formatMap.values())
      expect(formats.some((f) => f === 1)).toBe(true) // 1 = bold
    })

    it('extracts multiple blocks (paragraphs)', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({
            markdown: 'First paragraph\n\nSecond paragraph',
          })
          resolve()
        })
      })

      const { blocks } = await new Promise<{ blocks: TranslatableBlock[] }>(
        (resolve) => {
          editor.getEditorState().read(() => {
            resolve($extractTranslatableBlocks(editor))
          })
        },
      )

      expect(blocks).toHaveLength(2)
    })

    it('extracts headings', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({
            markdown: '# Title\n\nContent',
          })
          resolve()
        })
      })

      const { blocks } = await new Promise<{ blocks: TranslatableBlock[] }>(
        (resolve) => {
          editor.getEditorState().read(() => {
            resolve($extractTranslatableBlocks(editor))
          })
        },
      )

      expect(blocks).toHaveLength(2)
      expect(blocks[0]!.xml).toContain('Title')
      expect(blocks[1]!.xml).toContain('Content')
    })

    it('extracts list items', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({
            markdown: '- Item 1\n- Item 2\n- Item 3',
          })
          resolve()
        })
      })

      const { blocks } = await new Promise<{ blocks: TranslatableBlock[] }>(
        (resolve) => {
          editor.getEditorState().read(() => {
            resolve($extractTranslatableBlocks(editor))
          })
        },
      )

      expect(blocks).toHaveLength(3)
      expect(blocks[0]!.xml).toContain('Item 1')
      expect(blocks[1]!.xml).toContain('Item 2')
      expect(blocks[2]!.xml).toContain('Item 3')
    })

    it('skips code blocks', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({
            markdown: 'Before\n\n```\ncode\n```\n\nAfter',
          })
          resolve()
        })
      })

      const { blocks } = await new Promise<{ blocks: TranslatableBlock[] }>(
        (resolve) => {
          editor.getEditorState().read(() => {
            resolve($extractTranslatableBlocks(editor))
          })
        },
      )

      // Should have "Before" and "After" but not the code block
      expect(blocks.length).toBe(2)
      const allXml = blocks.map((b) => b.xml).join('')
      expect(allXml).not.toContain('code')
    })
  })

  describe('parseTranslatedXml', () => {
    it('parses simple XML response', () => {
      const xml = '<x id="a1">Bonjour</x><x id="a2"> monde</x>'
      const result = parseTranslatedXml(xml)

      expect(result.translations.get('a1')).toBe('Bonjour')
      expect(result.translations.get('a2')).toBe(' monde')
      expect(result.newOrder).toEqual(['a1', 'a2'])
    })

    it('handles reordered nodes', () => {
      // DeepL might reorder for different language grammar
      const xml = '<x id="a2">Text </x><x id="a1">wichtig</x>'
      const result = parseTranslatedXml(xml)

      expect(result.translations.get('a1')).toBe('wichtig')
      expect(result.translations.get('a2')).toBe('Text ')
      // New order reflects DeepL's reordering
      expect(result.newOrder).toEqual(['a2', 'a1'])
    })

    it('handles XML entities', () => {
      const xml = '<x id="a1">Less &lt; Greater &gt; Amp &amp;</x>'
      const result = parseTranslatedXml(xml)

      expect(result.translations.get('a1')).toBe('Less < Greater > Amp &')
    })
  })

  describe('full translation flow', () => {
    it('translates and preserves bold formatting', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({
            markdown: 'This is **important** text',
          })
          resolve()
        })
      })

      // Extract blocks
      const { blocks } = await new Promise<{ blocks: TranslatableBlock[] }>(
        (resolve) => {
          editor.getEditorState().read(() => {
            resolve($extractTranslatableBlocks(editor))
          })
        },
      )

      expect(blocks).toHaveLength(1)
      const block = blocks[0]!

      // Simulate DeepL response (same order)
      const mockTranslatedXml = block.xml
        .replace(/>This is </, ">C'est du <")
        .replace(/>important</, '>important<') // same word in French
        .replace(/> text</, '> texte<')

      const { translations, newOrder } = parseTranslatedXml(mockTranslatedXml)

      // Apply translation
      await new Promise<void>((resolve) => {
        editor.update(() => {
          const blockNode = $getNodeByKey(block.nodeKey)
          if (blockNode) {
            $applyBlockTranslation(
              blockNode as ElementNode,
              translations,
              block.formatMap,
              newOrder,
            )
          }
          resolve()
        })
      })

      // Export to markdown
      const result = await new Promise<string>((resolve) => {
        editor.getEditorState().read(() => {
          resolve(
            $convertToMarkdownString({ transformers: markdownTransformers }),
          )
        })
      })

      // Should preserve bold formatting
      expect(result).toContain('**')
    })

    it('handles word order changes', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({
            markdown: 'I have a **red** car',
          })
          resolve()
        })
      })

      const { blocks } = await new Promise<{ blocks: TranslatableBlock[] }>(
        (resolve) => {
          editor.getEditorState().read(() => {
            resolve($extractTranslatableBlocks(editor))
          })
        },
      )

      const block = blocks[0]!
      const nodeKeys = block.nodeOrder

      // Simulate German translation with reordering
      // English: "I have a **red** car" -> "Ich habe ein **rotes** Auto"
      // The word order stays same in this case, but format should be preserved
      const mockTranslatedXml = nodeKeys
        .map((key, i) => {
          const texts = ['Ich habe ein ', 'rotes', ' Auto']
          return `<x id="${key}">${texts[i] || ''}</x>`
        })
        .join('')

      const { translations, newOrder } = parseTranslatedXml(mockTranslatedXml)

      await new Promise<void>((resolve) => {
        editor.update(() => {
          const blockNode = $getNodeByKey(block.nodeKey)
          if (blockNode) {
            $applyBlockTranslation(
              blockNode as ElementNode,
              translations,
              block.formatMap,
              newOrder,
            )
          }
          resolve()
        })
      })

      const result = await new Promise<string>((resolve) => {
        editor.getEditorState().read(() => {
          resolve(
            $convertToMarkdownString({ transformers: markdownTransformers }),
          )
        })
      })

      expect(result).toContain('rotes')
      expect(result).toContain('**') // Bold preserved
    })
  })

  // Legacy tests - keep for backwards compatibility
  describe('Legacy: $extractTranslatableSegments', () => {
    it('extracts text from a simple paragraph', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({ markdown: 'Hello world' })
          resolve()
        })
      })

      const segments = await new Promise<TranslatableSegment[]>((resolve) => {
        editor.getEditorState().read(() => {
          resolve($extractTranslatableSegments())
        })
      })

      expect(segments).toHaveLength(1)
      expect(segments[0]?.text).toBe('Hello world')
    })
  })

  describe('Legacy: translateEditorState', () => {
    it('translates content and returns markdown', async () => {
      const editor = createMoldableHeadlessEditor()

      await new Promise<void>((resolve) => {
        editor.update(() => {
          $convertFromMarkdownString({ markdown: '# Hello\n\nWorld' })
          resolve()
        })
      })

      const translateFn = async (texts: string[]): Promise<string[]> => {
        return texts.map((t) => {
          if (t === 'Hello') return 'Bonjour'
          if (t === 'World') return 'Monde'
          return t
        })
      }

      const result = await translateEditorState(editor, translateFn)

      expect(result).toContain('# Bonjour')
      expect(result).toContain('Monde')
    })
  })
})
