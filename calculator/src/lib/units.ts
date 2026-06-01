// Unit and currency conversion tables. Everything is local-first: linear units
// convert through a base factor, temperature uses explicit formulas, and
// currency uses a bundled static snapshot (no network, no accounts). The
// currency rates are a fixed reference point the user can reason about — they
// are not live, and the UI says so.

export type CategoryId =
  | 'length'
  | 'mass'
  | 'temperature'
  | 'volume'
  | 'area'
  | 'speed'
  | 'data'
  | 'time'
  | 'currency'

export interface Unit {
  id: string
  name: string
  symbol: string
  // Factor relative to the category base unit (omitted for temperature).
  factor?: number
}

export interface Category {
  id: CategoryId
  name: string
  icon: string
  base: string
  units: Unit[]
}

// Currencies are converted with LIVE rates fetched server-side (see
// `src/server/rates.ts`). Rates are expressed as "units per 1 USD". This list
// is only the set of currencies the app offers in the picker; the numbers come
// from the network at runtime.
export const CURRENCY_BASE = 'USD'

// A live rate table: units per 1 USD (e.g. { EUR: 0.92, JPY: 156.5, USD: 1 }).
export type RateTable = Record<string, number>

export const CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'CAD',
  'AUD',
  'CHF',
  'INR',
  'MXN',
  'BRL',
  'KRW',
  'SGD',
  'HKD',
  'SEK',
  'NOK',
  'NZD',
  'ZAR',
] as const

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  INR: 'Indian Rupee',
  MXN: 'Mexican Peso',
  BRL: 'Brazilian Real',
  KRW: 'South Korean Won',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  NZD: 'New Zealand Dollar',
  ZAR: 'South African Rand',
}

export const CATEGORIES: Category[] = [
  {
    id: 'length',
    name: 'Length',
    icon: '📏',
    base: 'm',
    units: [
      { id: 'mm', name: 'Millimeter', symbol: 'mm', factor: 0.001 },
      { id: 'cm', name: 'Centimeter', symbol: 'cm', factor: 0.01 },
      { id: 'm', name: 'Meter', symbol: 'm', factor: 1 },
      { id: 'km', name: 'Kilometer', symbol: 'km', factor: 1000 },
      { id: 'in', name: 'Inch', symbol: 'in', factor: 0.0254 },
      { id: 'ft', name: 'Foot', symbol: 'ft', factor: 0.3048 },
      { id: 'yd', name: 'Yard', symbol: 'yd', factor: 0.9144 },
      { id: 'mi', name: 'Mile', symbol: 'mi', factor: 1609.344 },
      { id: 'nmi', name: 'Nautical mile', symbol: 'nmi', factor: 1852 },
    ],
  },
  {
    id: 'mass',
    name: 'Mass',
    icon: '⚖️',
    base: 'kg',
    units: [
      { id: 'mg', name: 'Milligram', symbol: 'mg', factor: 0.000001 },
      { id: 'g', name: 'Gram', symbol: 'g', factor: 0.001 },
      { id: 'kg', name: 'Kilogram', symbol: 'kg', factor: 1 },
      { id: 't', name: 'Metric ton', symbol: 't', factor: 1000 },
      { id: 'oz', name: 'Ounce', symbol: 'oz', factor: 0.0283495 },
      { id: 'lb', name: 'Pound', symbol: 'lb', factor: 0.453592 },
      { id: 'st', name: 'Stone', symbol: 'st', factor: 6.35029 },
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    icon: '🌡️',
    base: 'C',
    units: [
      { id: 'C', name: 'Celsius', symbol: '°C' },
      { id: 'F', name: 'Fahrenheit', symbol: '°F' },
      { id: 'K', name: 'Kelvin', symbol: 'K' },
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    icon: '🧪',
    base: 'l',
    units: [
      { id: 'ml', name: 'Milliliter', symbol: 'mL', factor: 0.001 },
      { id: 'l', name: 'Liter', symbol: 'L', factor: 1 },
      { id: 'm3', name: 'Cubic meter', symbol: 'm³', factor: 1000 },
      { id: 'tsp', name: 'Teaspoon (US)', symbol: 'tsp', factor: 0.00492892 },
      {
        id: 'tbsp',
        name: 'Tablespoon (US)',
        symbol: 'tbsp',
        factor: 0.0147868,
      },
      {
        id: 'floz',
        name: 'Fluid ounce (US)',
        symbol: 'fl oz',
        factor: 0.0295735,
      },
      { id: 'cup', name: 'Cup (US)', symbol: 'cup', factor: 0.236588 },
      { id: 'pt', name: 'Pint (US)', symbol: 'pt', factor: 0.473176 },
      { id: 'qt', name: 'Quart (US)', symbol: 'qt', factor: 0.946353 },
      { id: 'gal', name: 'Gallon (US)', symbol: 'gal', factor: 3.78541 },
    ],
  },
  {
    id: 'area',
    name: 'Area',
    icon: '🟦',
    base: 'm2',
    units: [
      { id: 'cm2', name: 'Square centimeter', symbol: 'cm²', factor: 0.0001 },
      { id: 'm2', name: 'Square meter', symbol: 'm²', factor: 1 },
      { id: 'ha', name: 'Hectare', symbol: 'ha', factor: 10000 },
      { id: 'km2', name: 'Square kilometer', symbol: 'km²', factor: 1000000 },
      { id: 'ft2', name: 'Square foot', symbol: 'ft²', factor: 0.092903 },
      { id: 'yd2', name: 'Square yard', symbol: 'yd²', factor: 0.836127 },
      { id: 'acre', name: 'Acre', symbol: 'acre', factor: 4046.86 },
      { id: 'mi2', name: 'Square mile', symbol: 'mi²', factor: 2589988.11 },
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    icon: '🚀',
    base: 'mps',
    units: [
      { id: 'mps', name: 'Meters / second', symbol: 'm/s', factor: 1 },
      {
        id: 'kph',
        name: 'Kilometers / hour',
        symbol: 'km/h',
        factor: 0.277778,
      },
      { id: 'mph', name: 'Miles / hour', symbol: 'mph', factor: 0.44704 },
      { id: 'fps', name: 'Feet / second', symbol: 'ft/s', factor: 0.3048 },
      { id: 'kn', name: 'Knot', symbol: 'kn', factor: 0.514444 },
    ],
  },
  {
    id: 'data',
    name: 'Data',
    icon: '💾',
    base: 'B',
    units: [
      { id: 'b', name: 'Bit', symbol: 'bit', factor: 0.125 },
      { id: 'B', name: 'Byte', symbol: 'B', factor: 1 },
      { id: 'KB', name: 'Kilobyte', symbol: 'KB', factor: 1000 },
      { id: 'MB', name: 'Megabyte', symbol: 'MB', factor: 1e6 },
      { id: 'GB', name: 'Gigabyte', symbol: 'GB', factor: 1e9 },
      { id: 'TB', name: 'Terabyte', symbol: 'TB', factor: 1e12 },
      { id: 'KiB', name: 'Kibibyte', symbol: 'KiB', factor: 1024 },
      { id: 'MiB', name: 'Mebibyte', symbol: 'MiB', factor: 1048576 },
      { id: 'GiB', name: 'Gibibyte', symbol: 'GiB', factor: 1073741824 },
    ],
  },
  {
    id: 'time',
    name: 'Time',
    icon: '⏱️',
    base: 's',
    units: [
      { id: 'ms', name: 'Millisecond', symbol: 'ms', factor: 0.001 },
      { id: 's', name: 'Second', symbol: 's', factor: 1 },
      { id: 'min', name: 'Minute', symbol: 'min', factor: 60 },
      { id: 'h', name: 'Hour', symbol: 'h', factor: 3600 },
      { id: 'd', name: 'Day', symbol: 'd', factor: 86400 },
      { id: 'wk', name: 'Week', symbol: 'wk', factor: 604800 },
      { id: 'mo', name: 'Month (30d)', symbol: 'mo', factor: 2592000 },
      { id: 'yr', name: 'Year (365d)', symbol: 'yr', factor: 31536000 },
    ],
  },
  {
    id: 'currency',
    name: 'Currency',
    icon: '💱',
    base: CURRENCY_BASE,
    units: CURRENCY_CODES.map((code) => ({
      id: code,
      name: CURRENCY_NAMES[code] ?? code,
      symbol: code,
    })),
  },
]

export class ConvertError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConvertError'
  }
}

function findCategoryOfUnit(unitId: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.units.some((u) => u.id === unitId))
}

function convertTemperature(value: number, from: string, to: string): number {
  // Normalize to Celsius first.
  let c: number
  switch (from) {
    case 'C':
      c = value
      break
    case 'F':
      c = (value - 32) * (5 / 9)
      break
    case 'K':
      c = value - 273.15
      break
    default:
      throw new ConvertError(`Unknown temperature unit "${from}"`)
  }
  switch (to) {
    case 'C':
      return c
    case 'F':
      return c * (9 / 5) + 32
    case 'K':
      return c + 273.15
    default:
      throw new ConvertError(`Unknown temperature unit "${to}"`)
  }
}

export interface ConvertResult {
  value: number
  from: string
  to: string
  category: CategoryId
  result: number
}

/**
 * Convert a value between two units. The category can be supplied or inferred
 * from the units. Currency conversions require a live `rates` table (units per
 * 1 USD); the other categories ignore it. Throws ConvertError when units are
 * unknown, mismatched, or (for currency) when rates are missing.
 */
export function convert(
  value: number,
  from: string,
  to: string,
  category?: CategoryId,
  rates?: RateTable,
): ConvertResult {
  if (!Number.isFinite(value)) throw new ConvertError('Value must be a number')

  const cat: Category | undefined = category
    ? CATEGORIES.find((c) => c.id === category)
    : findCategoryOfUnit(from)

  if (!cat) throw new ConvertError(`Unknown unit "${from}"`)

  const fromUnit = cat.units.find((u) => u.id === from)
  const toUnit = cat.units.find((u) => u.id === to)
  if (!fromUnit) throw new ConvertError(`Unknown unit "${from}" in ${cat.name}`)
  if (!toUnit) throw new ConvertError(`Unknown unit "${to}" in ${cat.name}`)

  let result: number
  if (cat.id === 'temperature') {
    result = convertTemperature(value, from, to)
  } else if (cat.id === 'currency') {
    if (!rates) {
      throw new ConvertError('Live exchange rates are unavailable')
    }
    const fromRate = rates[from]
    const toRate = rates[to]
    if (fromRate === undefined || toRate === undefined) {
      throw new ConvertError('No live rate for this currency')
    }
    // value in `from` → USD → `to`.
    result = (value / fromRate) * toRate
  } else {
    if (fromUnit.factor === undefined || toUnit.factor === undefined) {
      throw new ConvertError('Unit is missing a conversion factor')
    }
    result = (value * fromUnit.factor) / toUnit.factor
  }

  return { value, from, to, category: cat.id, result }
}

export function unitSymbol(unitId: string): string {
  for (const cat of CATEGORIES) {
    const u = cat.units.find((unit) => unit.id === unitId)
    if (u) return u.symbol
  }
  return unitId
}
