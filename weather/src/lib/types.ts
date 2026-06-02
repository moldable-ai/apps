/** Units the app can render and request from Open-Meteo. */
export type Unit = 'fahrenheit' | 'celsius'

/** Resolved location for a weather lookup. */
export interface WeatherLocation {
  latitude: number
  longitude: number
  /** Human-readable place, e.g. "San Francisco". */
  name?: string
  region?: string
  country?: string
  timezone?: string
}

/** A city/place result returned by Open-Meteo's no-key geocoding API. */
export interface LocationSearchResult extends WeatherLocation {
  id: string
  displayName: string
}

/** Current conditions at the resolved location. */
export interface CurrentConditions {
  /** Temperature in the requested unit. */
  temperature: number
  /** "Feels like" / apparent temperature in the requested unit. */
  apparentTemperature: number
  /** WMO weather interpretation code. */
  code: number
  /** Friendly label for the WMO code, e.g. "Partly cloudy". */
  label: string
  /** Daylight flag — drives sun vs. moon iconography. */
  isDay: boolean
  /** Relative humidity, percent. */
  humidity: number
  /** Wind speed in mph. */
  windSpeed: number
  /** ISO timestamp of the observation. */
  time: string
}

/** A single day in the multi-day forecast. */
export interface ForecastDay {
  /** ISO date, e.g. "2026-05-29". */
  date: string
  code: number
  label: string
  high: number
  low: number
  /** Max precipitation probability for the day, percent. */
  precipitationProbability: number
}

/** A single hour in the short-term forecast. */
export interface ForecastHour {
  /** ISO timestamp. */
  time: string
  temperature: number
  code: number
  label: string
  /** Daylight flag for this forecast hour, when available. */
  isDay?: boolean
}

/** Full payload returned by `getWeather` — conditions + forecast + location. */
export interface WeatherData {
  unit: Unit
  location: WeatherLocation
  current: CurrentConditions
  hourly: ForecastHour[]
  daily: ForecastDay[]
  /** ISO timestamp of when this payload was assembled. */
  updatedAt: string
}
