import type { ImageQuality, ModelProvider } from '../../shared/types'

export type ModelRenderStatus = 'queued' | 'running' | 'success' | 'failed'

export type ModelAsset = {
  url: string
  fileName: string
  extension: 'glb' | 'gltf' | 'obj' | 'mtl' | 'png' | 'jpg' | 'jpeg'
}

export type DownloadedModel = {
  model: { fileName: string; buffer: Buffer }
  material?: { fileName: string; buffer: Buffer }
  texture?: { fileName: string; buffer: Buffer }
}

export type CreateModelTaskInput = {
  workspaceId?: string
  imageFileName: string
  sourcePath: string
  inputImageUrl: string
  quality?: ImageQuality
}

export type CreatedModelTask = {
  taskId: string
  modelDetail: string
  maxPolls: number
  pollIntervalMs: number
}

export type ModelRenderProvider = {
  id: ModelProvider
  label: string
  createTask: (input: CreateModelTaskInput) => Promise<CreatedModelTask>
  getStatus: (
    workspaceId: string | undefined,
    taskId: string,
  ) => Promise<ModelRenderStatus>
  downloadModel: (
    workspaceId: string | undefined,
    taskId: string,
  ) => Promise<DownloadedModel>
}
