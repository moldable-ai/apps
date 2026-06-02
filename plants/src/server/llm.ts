import type { Plant, PlantCare } from '../lib/types'

/**
 * OpenAI strict structured outputs require every object property to be listed
 * in `required` and forbid `additionalProperties`, so the model returns `null`
 * for fields it can't fill. `prune` deeply removes those nulls/empties before we
 * store the result, keeping the saved JSON tidy and the UI's truthiness checks
 * honest.
 */
export function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => prune(v)).filter((v) => !isEmpty(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const pv = prune(v)
      if (!isEmpty(pv)) out[k] = pv
    }
    return out as T
  }
  return value
}

function isEmpty(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
  )
}

type AppLlmMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
  imagePaths?: string[]
}

type GenerateAppJsonOptions = {
  workspaceId?: string
  purpose: string
  system?: string
  prompt?: string
  messages?: AppLlmMessage[]
  imagePaths?: string[]
  schema: Record<string, unknown>
  schemaName?: string
  schemaDescription?: string
  maxOutputTokens?: number
  timeoutMs?: number
}

function getAppLlmConfig() {
  const aiServerUrl =
    process.env.MOLDABLE_AI_SERVER_URL || 'http://127.0.0.1:39200'
  const appId = process.env.MOLDABLE_APP_ID || 'plants'
  const appToken = process.env.MOLDABLE_APP_TOKEN

  if (!appToken) {
    throw new Error('Moldable app token is not available.')
  }

  return { aiServerUrl, appId, appToken }
}

export async function generateAppJson<T>(
  options: GenerateAppJsonOptions,
): Promise<T> {
  const { aiServerUrl, appId, appToken } = getAppLlmConfig()

  const res = await fetch(`${aiServerUrl}/api/llm/generate-json`, {
    method: 'POST',
    signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
    headers: {
      'Content-Type': 'application/json',
      'x-moldable-app-id': appId,
      'x-moldable-app-token': appToken,
    },
    body: JSON.stringify({
      appId,
      workspaceId: options.workspaceId,
      purpose: options.purpose,
      system: options.system,
      prompt: options.prompt,
      messages: options.messages,
      imagePaths: options.imagePaths,
      schema: options.schema,
      schemaName: options.schemaName,
      schemaDescription: options.schemaDescription,
      maxOutputTokens: options.maxOutputTokens,
    }),
  })

  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error || 'Failed to generate structured JSON.')
  }

  return body.json as T
}

// JSON Schema describing the PlantCare shape we want the model to return.
// Strict (OpenAI structured outputs): every object sets additionalProperties:
// false and lists ALL properties in `required`; optional fields are nullable.
export const PLANT_CARE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
      description:
        'One or two sentence overview of how to care for this plant.',
    },
    light: { type: ['string', 'null'], description: 'Light requirements.' },
    water: {
      type: 'object',
      additionalProperties: false,
      properties: {
        intervalDays: {
          type: ['integer', 'null'],
          description:
            'Typical days between waterings in the active growing season. Null if you are genuinely unsure.',
        },
        winterIntervalDays: {
          type: ['integer', 'null'],
          description:
            "Days between waterings during winter dormancy — usually 1.5–3x the active interval. Null if this plant doesn't go dormant or you're unsure.",
        },
        amountMl: { type: ['integer', 'null'] },
        method: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
      },
      required: [
        'intervalDays',
        'winterIntervalDays',
        'amountMl',
        'method',
        'notes',
      ],
    },
    dormancy: {
      type: ['string', 'null'],
      description:
        "If/when this plant rests and how care changes (e.g. 'Slows Nov–Feb; water sparingly and stop feeding'). Null if it stays active year-round.",
    },
    humidity: { type: ['string', 'null'] },
    temperatureF: {
      type: 'object',
      additionalProperties: false,
      properties: {
        min: { type: ['integer', 'null'] },
        max: { type: ['integer', 'null'] },
      },
      required: ['min', 'max'],
    },
    soil: { type: ['string', 'null'] },
    feeding: {
      type: 'object',
      additionalProperties: false,
      properties: {
        intervalDays: { type: ['integer', 'null'] },
        fertilizer: { type: ['string', 'null'] },
        season: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
      },
      required: ['intervalDays', 'fertilizer', 'season', 'notes'],
    },
    toxicity: {
      type: ['string', 'null'],
      description: 'Toxicity to pets or humans, if any.',
    },
    commonProblems: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: 'Common problems and how to spot them.',
    },
    careMarkdown: {
      type: 'string',
      description:
        'A concise Markdown care guide (a few short sections) for this plant.',
    },
  },
  required: [
    'summary',
    'light',
    'water',
    'dormancy',
    'humidity',
    'temperatureF',
    'soil',
    'feeding',
    'toxicity',
    'commonProblems',
    'careMarkdown',
  ],
}

export type PlantImageIdentification = {
  commonName: string
  scientificName?: string
  family?: string
  confidence?: number
  candidates?: Array<{
    name: string
    commonName?: string
    confidence?: number
  }>
  notes?: string
}

export const PLANT_IMAGE_IDENTIFICATION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    commonName: {
      type: 'string',
      description:
        "The most likely common name for the plant. Use 'Unknown plant' only if the image is genuinely ambiguous.",
    },
    scientificName: {
      type: ['string', 'null'],
      description: 'The most likely Latin binomial when visible enough.',
    },
    family: { type: ['string', 'null'] },
    confidence: {
      type: 'number',
      description: 'Identification confidence from 0 to 1.',
    },
    candidates: {
      type: ['array', 'null'],
      description: 'Up to 3 alternative IDs, most likely first.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          commonName: { type: ['string', 'null'] },
          confidence: { type: ['number', 'null'] },
        },
        required: ['name', 'commonName', 'confidence'],
      },
    },
    notes: {
      type: ['string', 'null'],
      description:
        'One short sentence describing visible clues or uncertainty.',
    },
  },
  required: [
    'commonName',
    'scientificName',
    'family',
    'confidence',
    'candidates',
    'notes',
  ],
}

export async function identifyPlantImage(
  imagePath: string,
  workspaceId?: string,
): Promise<PlantImageIdentification | undefined> {
  try {
    const system =
      'You are a careful houseplant identification assistant. Identify the plant from the image. ' +
      'Prefer common houseplant names, include a scientific name only when reasonably likely, ' +
      'and be honest about uncertainty.'

    const result = await generateAppJson<PlantImageIdentification>({
      workspaceId,
      purpose: 'plants.identify-image',
      system,
      prompt:
        'Identify this houseplant from the attached photo. Return only the structured fields.',
      imagePaths: [imagePath],
      schema: PLANT_IMAGE_IDENTIFICATION_SCHEMA,
      schemaName: 'PlantImageIdentification',
      schemaDescription:
        'Best-effort plant identification from one houseplant photo.',
      maxOutputTokens: 800,
    })

    const cleaned = prune(result)
    if (!cleaned || typeof cleaned !== 'object') return undefined
    if (!cleaned.commonName?.trim()) return undefined
    return cleaned
  } catch (error) {
    console.error('Failed to identify plant image:', error)
    return undefined
  }
}

/**
 * Generate an AI care profile for a plant via the host LLM proxy.
 * Returns undefined (never throws) when the AI server is unavailable or the
 * generation fails, so callers can degrade gracefully.
 */
export async function generateCareProfile(
  plant: Plant,
  workspaceId?: string,
): Promise<PlantCare | undefined> {
  try {
    const descriptorLines = [
      `Common name: ${plant.commonName}`,
      plant.scientificName ? `Scientific name: ${plant.scientificName}` : null,
      plant.family ? `Family: ${plant.family}` : null,
      plant.room ? `Room: ${plant.room}` : null,
      plant.location ? `Micro-location: ${plant.location}` : null,
      plant.light ? `Light note: ${plant.light}` : null,
      plant.notes ? `Owner notes: ${plant.notes}` : null,
    ].filter((line): line is string => Boolean(line))

    const system =
      'You are a horticulturist helping a home grower keep a house plant alive. ' +
      'Return accurate, practical care guidance for the specific plant described. ' +
      'Prefer concrete numbers (watering interval in days, temperature range in Fahrenheit). ' +
      'Most house plants slow in winter: when this one does, give a longer winterIntervalDays ' +
      '(typically 1.5–3x the active interval) and a short dormancy note. ' +
      'Keep the careMarkdown concise and skimmable with a few short sections. ' +
      'Use null for any field you are genuinely unsure about rather than guessing.'

    const prompt =
      `Produce a care profile for this house plant.\n\n` +
      descriptorLines.join('\n')

    const care = await generateAppJson<PlantCare>({
      workspaceId,
      purpose: 'plants.care',
      system,
      prompt,
      schema: PLANT_CARE_SCHEMA,
      schemaName: 'PlantCare',
      schemaDescription:
        'Structured care profile for a single house plant, including a watering interval in days and a concise Markdown care guide.',
    })

    if (!care || typeof care !== 'object') return undefined

    const cleaned = prune(care)
    cleaned.generatedAt = new Date().toISOString()
    cleaned.model = process.env.MOLDABLE_APP_ID
      ? `${process.env.MOLDABLE_APP_ID}:host-llm`
      : 'host-llm'

    return cleaned
  } catch (error) {
    console.error('Failed to generate plant care profile:', error)
    return undefined
  }
}
