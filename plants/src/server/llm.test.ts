import {
  PLANT_CARE_SCHEMA,
  PLANT_IMAGE_IDENTIFICATION_SCHEMA,
  prune,
} from './llm'
import { describe, expect, it } from 'vitest'

type SchemaNode = {
  type?: unknown
  properties?: Record<string, SchemaNode>
  required?: unknown
  additionalProperties?: unknown
  items?: SchemaNode
}

function isObjectNode(node: SchemaNode): boolean {
  const t = node.type
  return t === 'object' || (Array.isArray(t) && t.includes('object'))
}

/**
 * OpenAI strict structured outputs require every object to set
 * additionalProperties:false and to list EVERY property in `required`
 * (optional fields are expressed as nullable types instead). This walks the
 * schema and fails loudly if any node breaks that rule.
 */
function assertStrict(node: SchemaNode, path = 'root'): void {
  if (isObjectNode(node) && node.properties) {
    expect(node.additionalProperties, `${path}: additionalProperties`).toBe(
      false,
    )
    expect(
      Array.isArray(node.required),
      `${path}: required must be an array`,
    ).toBe(true)
    const required = new Set(node.required as string[])
    for (const key of Object.keys(node.properties)) {
      expect(required.has(key), `${path}: "${key}" must be required`).toBe(true)
      assertStrict(node.properties[key]!, `${path}.${key}`)
    }
  }
  if (node.items) assertStrict(node.items, `${path}[]`)
}

describe('LLM structured-output schemas are OpenAI-strict', () => {
  it('PlantCare schema is strict at every level', () => {
    assertStrict(PLANT_CARE_SCHEMA as SchemaNode, 'PlantCare')
  })
  it('PlantImageIdentification schema is strict at every level', () => {
    assertStrict(
      PLANT_IMAGE_IDENTIFICATION_SCHEMA as SchemaNode,
      'PlantImageIdentification',
    )
  })
})

describe('prune', () => {
  it('removes nulls and empties deeply', () => {
    expect(
      prune({ a: null, b: '', c: 1, d: { e: null }, f: [null, 'x'] }),
    ).toEqual({ c: 1, f: ['x'] })
  })
  it('keeps meaningful falsy values (0, false)', () => {
    expect(prune({ n: 0, b: false })).toEqual({ n: 0, b: false })
  })
})
