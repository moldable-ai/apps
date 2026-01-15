import {
  applyTranslatedXml,
  markdownToTranslatableXml,
  translateMarkdown,
} from './translation-service'
import { describe, expect, it, vi } from 'vitest'

describe('Translation Service', () => {
  describe('markdownToTranslatableXml', () => {
    it('returns null for empty markdown', async () => {
      const result = await markdownToTranslatableXml('')
      expect(result).toBeNull()
    })

    it('returns null for whitespace-only markdown', async () => {
      const result = await markdownToTranslatableXml('   \n\n   ')
      expect(result).toBeNull()
    })

    it('extracts simple paragraph', async () => {
      const result = await markdownToTranslatableXml('Hello world')

      expect(result).not.toBeNull()
      expect(result!.blocks).toHaveLength(1)
      expect(result!.xml).toContain('<block id="0">')
      expect(result!.xml).toContain('Hello world')
      expect(result!.xml).toMatch(/<x id="[^"]+">Hello world<\/x>/)
    })

    it('extracts multiple paragraphs', async () => {
      const result = await markdownToTranslatableXml(
        'First paragraph\n\nSecond paragraph',
      )

      expect(result).not.toBeNull()
      expect(result!.blocks).toHaveLength(2)
      expect(result!.xml).toContain('<block id="0">')
      expect(result!.xml).toContain('<block id="1">')
    })

    it('extracts headings', async () => {
      const result = await markdownToTranslatableXml('# Title\n\nContent')

      expect(result).not.toBeNull()
      expect(result!.blocks).toHaveLength(2)
      expect(result!.xml).toContain('Title')
      expect(result!.xml).toContain('Content')
    })

    it('extracts list items', async () => {
      const result = await markdownToTranslatableXml(
        '- Item 1\n- Item 2\n- Item 3',
      )

      expect(result).not.toBeNull()
      expect(result!.blocks).toHaveLength(3)
      expect(result!.xml).toContain('Item 1')
      expect(result!.xml).toContain('Item 2')
      expect(result!.xml).toContain('Item 3')
    })

    it('preserves format info for bold text', async () => {
      const result = await markdownToTranslatableXml('This is **important**')

      expect(result).not.toBeNull()
      // Should have format info for the bold node
      const firstBlock = result!.blocks[0]
      expect(firstBlock).toBeDefined()
      const hasBoldFormat = Array.from(firstBlock!.formatMap.values()).some(
        (f) => f === 1, // 1 = bold
      )
      expect(hasBoldFormat).toBe(true)
    })

    it('skips code blocks', async () => {
      const result = await markdownToTranslatableXml(
        'Before\n\n```\ncode here\n```\n\nAfter',
      )

      expect(result).not.toBeNull()
      expect(result!.xml).not.toContain('code here')
      expect(result!.xml).toContain('Before')
      expect(result!.xml).toContain('After')
    })
  })

  describe('applyTranslatedXml', () => {
    it('applies simple translation', async () => {
      const markdown = 'Hello world'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()

      // Simulate DeepL response - replace text while keeping structure
      const translatedXml = extracted!.xml.replace(
        />Hello world</,
        '>Bonjour le monde<',
      )

      const result = await applyTranslatedXml(
        translatedXml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result).toBe('Bonjour le monde')
    })

    it('preserves bold formatting after translation', async () => {
      const markdown = 'This is **important** text'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()

      // Simulate DeepL response
      const translatedXml = extracted!.xml
        .replace(/>This is </, ">C'est du <")
        .replace(/>important</, '>important<')
        .replace(/> text</, '> texte<')

      const result = await applyTranslatedXml(
        translatedXml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Should preserve bold markers
      expect(result).toContain('**')
      expect(result).toContain('important')
    })

    it('handles multiple blocks', async () => {
      const markdown = '# Title\n\nParagraph content'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()

      const translatedXml = extracted!.xml
        .replace(/>Title</, '>Titre<')
        .replace(/>Paragraph content</, '>Contenu du paragraphe<')

      const result = await applyTranslatedXml(
        translatedXml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result).toContain('# Titre')
      expect(result).toContain('Contenu du paragraphe')
    })
  })

  describe('translateMarkdown (full pipeline)', () => {
    it('translates with mock DeepL', async () => {
      const markdown = 'Hello world'

      // Mock fetch to intercept and modify the XML
      const mockFetch = vi
        .fn()
        .mockImplementation(async (_url: string, options: { body: string }) => {
          const body = JSON.parse(options.body)
          // Echo back the XML with text replaced
          const translatedXml = body.text[0].replace(
            />Hello world</,
            '>Bonjour le monde<',
          )
          return {
            ok: true,
            json: async () => ({
              translations: [{ text: translatedXml }],
            }),
          }
        })
      vi.stubGlobal('fetch', mockFetch)

      const result = await translateMarkdown(
        markdown,
        'en',
        'fr',
        'test-api-key',
      )

      // Verify DeepL was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const call = mockFetch.mock.calls[0] as [string, { body: string }]
      const [callUrl, callOptions] = call
      expect(callUrl).toContain('/v2/translate')

      const body = JSON.parse(callOptions.body)
      expect(body.source_lang).toBe('EN')
      expect(body.target_lang).toBe('FR')
      expect(body.tag_handling).toBe('xml')
      expect(body.text[0]).toContain('<block id="0">')
      expect(body.text[0]).toContain('Hello world')

      // The result should be translated
      expect(result).toBe('Bonjour le monde')

      vi.unstubAllGlobals()
    })

    it('returns original markdown when empty', async () => {
      const result = await translateMarkdown('', 'en', 'fr', 'test-api-key')
      expect(result).toBe('')
    })

    it('throws on DeepL API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(
        translateMarkdown('Hello', 'en', 'fr', 'bad-key'),
      ).rejects.toThrow('DeepL API error')

      vi.unstubAllGlobals()
    })
  })

  describe('round-trip translation', () => {
    const testCases = [
      { name: 'simple paragraph', markdown: 'Hello world' },
      { name: 'heading', markdown: '# Title' },
      { name: 'multiple headings', markdown: '# H1\n\n## H2\n\n### H3' },
      { name: 'bullet list', markdown: '- Item 1\n- Item 2\n- Item 3' },
      { name: 'numbered list', markdown: '1. First\n2. Second\n3. Third' },
      { name: 'bold text', markdown: '**bold text**' },
      { name: 'italic text', markdown: '*italic text*' },
      { name: 'mixed formatting', markdown: 'Normal **bold** and *italic*' },
      { name: 'blockquote', markdown: '> This is a quote' },
    ]

    testCases.forEach(({ name, markdown }) => {
      it(`preserves structure for ${name} with identity translation`, async () => {
        const extracted = await markdownToTranslatableXml(markdown)

        if (!extracted) {
          // Some markdown might result in no translatable blocks
          return
        }

        // Identity "translation" - just return the same XML
        const result = await applyTranslatedXml(
          extracted.xml,
          extracted.blocks,
          extracted.structure,
          extracted.editor,
        )

        // Check that all original words are preserved in the result
        // Note: with shouldPreserveNewLines: true, we add <br> tags for empty
        // paragraphs which may change the structure but preserves visual parity
        for (const block of extracted.blocks) {
          // Extract words from XML (strip tags and get individual words)
          const textContent = block.xml.replace(/<[^>]+>/g, '')
          const words = textContent.split(/\s+/).filter((w) => w.length > 2)
          for (const word of words) {
            expect(result).toContain(word)
          }
        }
      })
    })
  })

  describe('paragraph and newline preservation', () => {
    it('preserves blank lines between multiple paragraphs', async () => {
      const markdown = 'First paragraph\n\nSecond paragraph\n\nThird paragraph'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()
      expect(extracted!.blocks).toHaveLength(3)

      // Simulate identity translation
      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Should preserve the paragraph separation
      expect(result).toContain('First paragraph')
      expect(result).toContain('Second paragraph')
      expect(result).toContain('Third paragraph')
      // Check for proper paragraph separation (double newline)
      expect(result.split('\n\n').length).toBeGreaterThanOrEqual(3)
    })

    it('preserves heading followed by paragraphs', async () => {
      const markdown =
        '# Hello\n\nAnd is this working?\n\nIt should preserve newlines'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()
      expect(extracted!.blocks).toHaveLength(3)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Heading should be preserved
      expect(result).toMatch(/^# Hello/)
      // Paragraphs should be separated
      expect(result).toContain('And is this working?')
      expect(result).toContain('It should preserve newlines')
      // Count separate blocks (heading + 2 paragraphs)
      const lines = result.split('\n').filter((l) => l.trim())
      expect(lines.length).toBeGreaterThanOrEqual(3)
    })

    it('preserves bullet list followed by paragraphs', async () => {
      const markdown =
        '- Hello\n- New line here\n\n# Hello\n\nAnd is this working?'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()
      // 2 list items + 1 heading + 1 paragraph = 4 blocks
      expect(extracted!.blocks).toHaveLength(4)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Check list items are preserved
      expect(result).toMatch(/- Hello/)
      expect(result).toMatch(/- New line here/)
      // Check heading
      expect(result).toMatch(/# Hello/)
      // Check paragraph
      expect(result).toContain('And is this working?')
    })

    it('preserves blockquote structure', async () => {
      const markdown = '> This is a quote\n\nRegular paragraph after'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()
      expect(extracted!.blocks).toHaveLength(2)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Blockquote should be preserved
      expect(result).toMatch(/^> This is a quote/m)
      expect(result).toContain('Regular paragraph after')
    })

    it('preserves mixed formatting within paragraphs', async () => {
      const markdown =
        'This has **bold** and *italic* text\n\nAnother paragraph with **more bold**'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()
      expect(extracted!.blocks).toHaveLength(2)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Check both paragraphs exist with formatting
      expect(result).toContain('**bold**')
      expect(result).toContain('*italic*')
      expect(result).toContain('**more bold**')
      // Check separation
      expect(result.split('\n\n').length).toBeGreaterThanOrEqual(2)
    })

    it('preserves numbered list structure', async () => {
      const markdown =
        '1. First item\n2. Second item\n3. Third item\n\nParagraph after list'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()
      // 3 list items + 1 paragraph = 4 blocks
      expect(extracted!.blocks).toHaveLength(4)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result).toContain('First item')
      expect(result).toContain('Second item')
      expect(result).toContain('Third item')
      expect(result).toContain('Paragraph after list')
    })

    it('handles complex journaling content', async () => {
      const markdown = `# Daily Journal

Today was a productive day. I worked on several things:

- Fixed the translation bug
- Added new tests
- Reviewed pull requests

## Reflection

The key insight was that **newlines matter** for readability.

> Always write tests for edge cases

That's my takeaway for today.`

      const extracted = await markdownToTranslatableXml(markdown)
      expect(extracted).not.toBeNull()

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Verify structure elements are preserved
      expect(result).toMatch(/^# Daily Journal/m)
      expect(result).toMatch(/^## Reflection/m)
      expect(result).toContain('Today was a productive day')
      expect(result).toContain('- Fixed the translation bug')
      expect(result).toContain('**newlines matter**')
      expect(result).toMatch(/^> Always write tests/m)
      expect(result).toContain("That's my takeaway")
    })
  })

  describe('DeepL response handling', () => {
    it('handles DeepL potentially removing whitespace between blocks', async () => {
      const markdown = 'First paragraph\n\nSecond paragraph'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()

      // Simulate DeepL response with translations
      const translatedXml = extracted!.xml
        .replace(/>First paragraph</, '>Premier paragraphe<')
        .replace(/>Second paragraph</, '>Deuxième paragraphe<')

      const result = await applyTranslatedXml(
        translatedXml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Should still have two paragraphs
      expect(result).toContain('Premier paragraphe')
      expect(result).toContain('Deuxième paragraphe')
      // Check they are separated (with <br> for the empty paragraph)
      expect(result).toMatch(
        /Premier paragraphe\n\n<br>\n\nDeuxième paragraphe/,
      )
    })

    it('handles translation of bullets followed by heading and paragraph', async () => {
      const markdown =
        '- Hello\n- New line here\n\n# Hello\n\nAnd is this working?'
      const extracted = await markdownToTranslatableXml(markdown)

      expect(extracted).not.toBeNull()

      // Simulate DeepL translation
      const translatedXml = extracted!.xml
        .replace(/>Hello</, '>Hej<')
        .replace(/>New line here</, '>Ny linje her<')
        .replace(/>And is this working\?</, '>Og virker det?<')

      const result = await applyTranslatedXml(
        translatedXml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      // Verify structure is maintained
      expect(result).toMatch(/- Hej\n- Ny linje her/)
      expect(result).toMatch(/# Hello/) // Heading has same text "Hello" -> "Hej"
      expect(result).toContain('Og virker det?')
    })
  })

  describe('exact markdown output verification', () => {
    it('outputs identical markdown for simple paragraph', async () => {
      const markdown = 'Hello world'
      const extracted = await markdownToTranslatableXml(markdown)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result.trim()).toBe(markdown)
    })

    it('outputs identical markdown for heading', async () => {
      const markdown = '# Title'
      const extracted = await markdownToTranslatableXml(markdown)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result.trim()).toBe(markdown)
    })

    it('outputs identical markdown for bullet list', async () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3'
      const extracted = await markdownToTranslatableXml(markdown)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result.trim()).toBe(markdown)
    })

    it('outputs markdown with <br> for empty paragraphs between paragraphs', async () => {
      // With shouldPreserveNewLines: true, \n\n creates an empty paragraph
      // which we preserve as <br> for visual parity
      const markdown = 'First paragraph\n\nSecond paragraph'
      const extracted = await markdownToTranslatableXml(markdown)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result.trim()).toBe('First paragraph\n\n<br>\n\nSecond paragraph')
    })

    it('outputs markdown with <br> for empty paragraphs between heading and paragraph', async () => {
      // With shouldPreserveNewLines: true, \n\n creates an empty paragraph
      const markdown = '# Title\n\nContent here'
      const extracted = await markdownToTranslatableXml(markdown)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result.trim()).toBe('# Title\n\n<br>\n\nContent here')
    })

    it('outputs identical markdown for blockquote', async () => {
      const markdown = '> This is a quote'
      const extracted = await markdownToTranslatableXml(markdown)

      const result = await applyTranslatedXml(
        extracted!.xml,
        extracted!.blocks,
        extracted!.structure,
        extracted!.editor,
      )

      expect(result.trim()).toBe(markdown)
    })
  })
})
