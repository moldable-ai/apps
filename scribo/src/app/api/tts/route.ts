import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_VOICE_ID, MULTILINGUAL_MODEL } from '@/lib/tts/voice-ids'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, languageCode } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        {
          error:
            'ELEVENLABS_API_KEY not configured. ' +
            'Get an API key at https://elevenlabs.io and add ELEVENLABS_API_KEY to .env.local',
        },
        { status: 503 },
      )
    }

    // Use Multilingual v2 model - supports 29 languages with same voice
    // Just pass languageCode to speak in that language
    // https://elevenlabs.io/blog/eleven-multilingual-v2
    const audioStream = await elevenlabs.textToSpeech.convert(
      DEFAULT_VOICE_ID,
      {
        text,
        modelId: MULTILINGUAL_MODEL,
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
          speed: 0.9, // Slightly slower for language learning
        },
        ...(languageCode && { languageCode }),
      },
    )

    return new Response(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 },
    )
  }
}
