import type { ModelProvider } from '../../shared/types'
import { falProvider } from './fal'
import { tripoProvider } from './tripo'
import type { ModelRenderProvider } from './types'

const PROVIDERS: Record<ModelProvider, ModelRenderProvider> = {
  fal: falProvider,
  tripo: tripoProvider,
}

export function getModelRenderProvider(
  provider: ModelProvider,
): ModelRenderProvider {
  return PROVIDERS[provider]
}

export { PROVIDERS as MODEL_RENDER_PROVIDERS }
export type { ModelRenderProvider } from './types'
