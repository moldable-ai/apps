import { NextRequest, NextResponse } from 'next/server'
import type { Language } from '@/lib/languages'
import {
  applyTranslatedXml,
  callDeepL,
  extractBlocksWithHashes,
} from '@/lib/translation-service'
import type { TranslationCache } from '@/lib/types'
import 'server-only'
import { z } from 'zod'

const TranslateRequestSchema = z.object({
  markdown: z.string(),
  from: z.string().min(2).max(5),
  to: z.string().min(2).max(5),
  // Existing cache from the saved entry (loaded from disk)
  cache: z
    .object({
      sourceLang: z.string(),
      targetLang: z.string(),
      blocks: z.record(z.string()),
    })
    .optional()
    .nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = TranslateRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request: ' + parseResult.error.issues[0]?.message },
        { status: 400 },
      )
    }

    const { markdown, from, to, cache: existingCache } = parseResult.data

    const apiKey = process.env.DEEPL_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'DEEPL_API_KEY not configured. ' +
            'Get a free API key at https://www.deepl.com/pro-api ' +
            '(500,000 chars/month free). ' +
            'Then add DEEPL_API_KEY=your-key to apps/scribo/.env.local',
          code: 'MISSING_API_KEY',
        },
        { status: 503 },
      )
    }

    // Empty markdown - nothing to translate
    if (!markdown.trim()) {
      return NextResponse.json({
        translatedText: '',
        cache: { sourceLang: from, targetLang: to, blocks: {} },
      })
    }

    const apiUrl = process.env.DEEPL_API_URL || 'https://api-free.deepl.com'

    // Check if existing cache is valid for this language pair
    const validCache =
      existingCache &&
      existingCache.sourceLang === from &&
      existingCache.targetLang === to
        ? existingCache.blocks
        : {}

    // Extract blocks with content hashes for cache lookup
    const extracted = await extractBlocksWithHashes(markdown)

    if (!extracted) {
      return NextResponse.json({
        translatedText: markdown,
        cache: { sourceLang: from, targetLang: to, blocks: {} },
      })
    }

    // Separate cached vs uncached blocks
    const uncachedBlocks: typeof extracted.blocks = []
    const uncachedIndices: number[] = []
    const cachedTranslations: Map<number, string> = new Map()

    extracted.blocks.forEach((block, index) => {
      const cached = validCache[block.contentHash]
      if (cached) {
        // Use cached translation
        cachedTranslations.set(index, cached)
      } else {
        // Need to translate this block
        uncachedBlocks.push(block)
        uncachedIndices.push(index)
      }
    })

    // Build new cache starting with used cached entries
    const newCacheBlocks: Record<string, string> = {}

    // If everything is cached, skip DeepL call entirely
    let translatedBlocksMap: Map<number, string>

    if (uncachedBlocks.length === 0) {
      // All blocks were cached - no API call needed!
      translatedBlocksMap = cachedTranslations
    } else {
      // Build XML for only the uncached blocks
      const xml = uncachedBlocks
        .map((b, i) => `<block id="${i}">${b.xml}</block>`)
        .join('')

      // Call DeepL only for uncached content
      const translatedXml = await callDeepL(xml, from, to, apiKey, apiUrl)

      // Parse DeepL response
      const blockRegex = /<block id="(\d+)">([\s\S]*?)<\/block>/g
      translatedBlocksMap = new Map(cachedTranslations)
      let match

      while ((match = blockRegex.exec(translatedXml)) !== null) {
        const localIndex = parseInt(match[1]!, 10)
        const translatedContent = match[2]!
        const originalIndex = uncachedIndices[localIndex]!
        const block = uncachedBlocks[localIndex]!

        translatedBlocksMap.set(originalIndex, translatedContent)

        // Add to new cache
        newCacheBlocks[block.contentHash] = translatedContent
      }
    }

    // Add all used cached entries to the new cache
    extracted.blocks.forEach((block) => {
      const cachedValue = validCache[block.contentHash]
      if (cachedValue && !newCacheBlocks[block.contentHash]) {
        newCacheBlocks[block.contentHash] = cachedValue
      }
    })

    // Apply translations to the editor
    const translatedText = await applyTranslatedXml(
      translatedBlocksMap,
      extracted.blocks,
      extracted.structure,
      extracted.editor,
    )

    // Return translation + updated cache to be saved with the entry
    const updatedCache: TranslationCache = {
      sourceLang: from as Language,
      targetLang: to as Language,
      blocks: newCacheBlocks,
    }

    return NextResponse.json({ translatedText, cache: updatedCache })
  } catch (error) {
    console.error('Translation error:', error)

    const message =
      error instanceof Error ? error.message : 'Translation failed'

    // Check if it's a DeepL API error
    if (message.includes('DeepL API error')) {
      return NextResponse.json({ error: message }, { status: 502 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
