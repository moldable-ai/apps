import type { HostingProvider, HostingProviderId } from '../types'
import { netlifyProvider } from './netlify'

const providers = [netlifyProvider] satisfies HostingProvider[]

export function listHostingProviders(): HostingProvider[] {
  return providers
}

export function getHostingProvider(id: HostingProviderId): HostingProvider {
  const provider = providers.find((item) => item.id === id)
  if (!provider) throw new Error(`Unsupported hosting provider: ${id}`)
  return provider
}

export function isHostingProviderId(
  value: unknown,
): value is HostingProviderId {
  return providers.some((provider) => provider.id === value)
}
