import type { PianoInstrumentPack } from '../shared/audio'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { SmplrPreset } from 'smplr'

type SfzMode = 'global' | 'group' | 'region'

type SfzValue = string | number

interface SfzTokenHeader {
  type: 'header'
  value: SfzMode
}

interface SfzTokenProp {
  type: 'prop'
  key: string
  value: SfzValue
}

type SfzToken = SfzTokenHeader | SfzTokenProp

type SfzProps = Record<string, SfzValue>

interface SfzToPresetOptions {
  baseUrl: string
  formats: string[]
}

function assertRelativePath(value: string) {
  if (path.isAbsolute(value) || value.split(/[\\/]/).includes('..')) {
    throw new Error('Invalid SFZ path')
  }
}

function encodeSamplePath(sample: string) {
  const withoutExtension = sample.replace(/\.[a-z0-9]+$/i, '')
  return withoutExtension
    .split(/[\\/]/)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function sampleKey(sample: string) {
  return sample.replace(/\.[a-z0-9]+$/i, '')
}

function resolveDefines(sfz: string) {
  const defines = new Map<string, string>()
  const lines: string[] = []

  for (const line of sfz.split('\n')) {
    const trimmed = line.trim()
    const match = trimmed.match(/^#define\s+(\$\w+)\s+(.+)$/)
    if (match) {
      defines.set(match[1], match[2].trim())
    } else {
      lines.push(line)
    }
  }

  let result = lines.join('\n')
  for (const [key, value] of defines) {
    result = result.split(key).join(value)
  }
  return result
}

function tokenize(sfz: string) {
  const tokens: SfzToken[] = []

  for (let line of resolveDefines(sfz).split('\n')) {
    const commentIndex = line.indexOf('//')
    if (commentIndex >= 0) line = line.slice(0, commentIndex)
    line = line.trim()
    if (!line) continue

    let position = 0
    while (position < line.length) {
      while (position < line.length && line[position] === ' ') position += 1
      if (position >= line.length) break

      if (line[position] === '<') {
        const end = line.indexOf('>', position)
        if (end < 0) break
        const header = line
          .slice(position + 1, end)
          .trim()
          .toLowerCase()
        if (header === 'global' || header === 'group' || header === 'region') {
          tokens.push({ type: 'header', value: header })
        }
        position = end + 1
        continue
      }

      const equalsIndex = line.indexOf('=', position)
      if (equalsIndex < 0) break

      const key = line.slice(position, equalsIndex).trim().toLowerCase()
      const rest = line.slice(equalsIndex + 1)
      const nextKeyMatch = rest.match(/\s+\S+=\S/)
      const rawValue =
        nextKeyMatch && nextKeyMatch.index !== undefined
          ? rest.slice(0, nextKeyMatch.index).trim()
          : rest.trim()

      if (key && rawValue) {
        const numericValue = Number(rawValue)
        tokens.push({
          type: 'prop',
          key,
          value: Number.isNaN(numericValue) ? rawValue : numericValue,
        })
      }

      if (nextKeyMatch && nextKeyMatch.index !== undefined) {
        position =
          equalsIndex +
          1 +
          nextKeyMatch.index +
          nextKeyMatch[0].length -
          nextKeyMatch[0].trimStart().length
      } else {
        position = line.length
      }
    }
  }

  return tokens
}

function num(props: SfzProps, key: string) {
  const value = props[key]
  return typeof value === 'number' ? value : undefined
}

function str(props: SfzProps, key: string) {
  const value = props[key]
  return typeof value === 'string' ? value : undefined
}

function buildGroup(props: SfzProps): SmplrPreset['groups'][number] {
  const group: SmplrPreset['groups'][number] = { regions: [] }

  const lokey = num(props, 'lokey')
  const hikey = num(props, 'hikey')
  if (lokey !== undefined && hikey !== undefined)
    group.keyRange = [lokey, hikey]

  const lovel = num(props, 'lovel')
  const hivel = num(props, 'hivel')
  if (lovel !== undefined && hivel !== undefined)
    group.velRange = [lovel, hivel]

  const seqLength = num(props, 'seq_length')
  if (seqLength !== undefined) group.seqLength = seqLength

  const groupNumber = num(props, 'group')
  if (groupNumber !== undefined) group.group = groupNumber

  const offBy = num(props, 'off_by')
  if (offBy !== undefined) group.offBy = offBy

  const volume = num(props, 'volume')
  if (volume !== undefined) group.volume = volume

  const ampAttack = num(props, 'ampeg_attack')
  if (ampAttack !== undefined) group.ampAttack = ampAttack

  const ampRelease = num(props, 'ampeg_release')
  if (ampRelease !== undefined) group.ampRelease = ampRelease

  const tune = num(props, 'tune')
  if (tune !== undefined) group.tune = tune / 100

  return group
}

function buildRegion(
  props: SfzProps,
  sampleMap: Record<string, string>,
): SmplrPreset['groups'][number]['regions'][number] | null {
  const sampleRaw = str(props, 'sample')
  if (!sampleRaw || sampleRaw.startsWith('*')) return null

  const sample = sampleKey(sampleRaw)
  sampleMap[sample] = encodeSamplePath(sampleRaw)

  const region: SmplrPreset['groups'][number]['regions'][number] = { sample }

  const key = num(props, 'key')
  if (key !== undefined) {
    region.key = key
  } else {
    const lokey = num(props, 'lokey')
    const hikey = num(props, 'hikey')
    if (lokey !== undefined && hikey !== undefined)
      region.keyRange = [lokey, hikey]
  }

  const pitchKeycenter = num(props, 'pitch_keycenter')
  if (pitchKeycenter !== undefined) {
    region.pitch = pitchKeycenter
  } else if (region.keyRange) {
    region.pitch = region.keyRange[0]
  } else if (key !== undefined) {
    region.pitch = key
  }

  const lovel = num(props, 'lovel')
  const hivel = num(props, 'hivel')
  if (lovel !== undefined && hivel !== undefined)
    region.velRange = [lovel, hivel]

  const seqPosition = num(props, 'seq_position')
  if (seqPosition !== undefined) region.seqPosition = seqPosition

  const groupNumber = num(props, 'group')
  if (groupNumber !== undefined) region.group = groupNumber

  const offBy = num(props, 'off_by')
  if (offBy !== undefined) region.offBy = offBy

  const volume = num(props, 'volume')
  if (volume !== undefined) region.volume = volume

  const tune = num(props, 'tune')
  if (tune !== undefined) region.tune = tune / 100

  const ampAttack = num(props, 'ampeg_attack')
  if (ampAttack !== undefined) region.ampAttack = ampAttack

  const ampRelease = num(props, 'ampeg_release')
  if (ampRelease !== undefined) region.ampRelease = ampRelease

  return region
}

export function sfzToSmplrPreset(sfzText: string, options: SfzToPresetOptions) {
  const globalProps: SfzProps = {}
  let mode: SfzMode = 'global'
  let groupProps: SfzProps = {}
  let regionProps: SfzProps = {}
  const groups: SmplrPreset['groups'] = []
  const sampleMap: Record<string, string> = {}
  let currentGroup: SmplrPreset['groups'][number] | null = null

  const closeScope = () => {
    if (mode === 'global') {
      Object.assign(globalProps, regionProps)
    } else if (mode === 'group') {
      groupProps = { ...regionProps }
      currentGroup = buildGroup(groupProps)
      groups.push(currentGroup)
    } else {
      const merged = { ...globalProps, ...groupProps, ...regionProps }
      const region = buildRegion(merged, sampleMap)
      if (region) {
        currentGroup ??= { regions: [] }
        if (!groups.includes(currentGroup)) groups.push(currentGroup)
        currentGroup.regions.push(region)
      }
    }
    regionProps = {}
  }

  for (const token of tokenize(sfzText)) {
    if (token.type === 'header') {
      closeScope()
      mode = token.value
      if (mode === 'group') {
        groupProps = {}
        currentGroup = null
      }
    } else {
      regionProps[token.key] = token.value
    }
  }
  closeScope()

  return {
    samples: {
      baseUrl: options.baseUrl,
      formats: options.formats,
      map: sampleMap,
    },
    groups: groups.filter((group) => group.regions.length > 0),
  } satisfies SmplrPreset
}

export async function readSfzInstrumentPreset(
  pack: PianoInstrumentPack,
  instrumentId: string,
) {
  if (pack.status !== 'installed' || !pack.installedPath) {
    throw new Error(`${pack.name} is not installed`)
  }

  const instrument = pack.instruments.find(
    (candidate) => candidate.id === instrumentId,
  )
  if (!instrument?.sfzPath || !instrument.playable) {
    throw new Error('Playable SFZ instrument not found')
  }

  assertRelativePath(instrument.sfzPath)

  const root = pack.installedPath
  const sfzPath = path.join(root, instrument.sfzPath)
  if (!sfzPath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid SFZ path')
  }

  const sfzText = await readFile(sfzPath, 'utf8')
  const sfzDir = path.dirname(instrument.sfzPath)
  const baseUrl =
    sfzDir === '.'
      ? `/instruments/${pack.id}`
      : `/instruments/${pack.id}/${sfzDir
          .split(/[\\/]/)
          .map((segment) => encodeURIComponent(segment))
          .join('/')}`

  return {
    packId: pack.id,
    instrument,
    preset: sfzToSmplrPreset(sfzText, {
      baseUrl,
      formats: pack.format.includes('flac') ? ['flac'] : ['wav'],
    }),
  }
}
