import type { FormEvent } from 'react'
import type {
  ConnectionPolicyMode,
  ConnectionTestResponse,
} from '../shared/types'

export interface ConnectionFormState {
  connectionUrl: string
  name: string
  host: string
  port: string
  database: string
  user: string
  password: string
  ssl: boolean
  color: string | null
  environment: string | null
  policyMode: ConnectionPolicyMode
}

export interface SelectedTable {
  schema: string
  table: string
}

export interface ActivityEntry {
  id: string
  message: string
  detail?: string
  timestamp: string
}

export type ConnectionFormChange = <K extends keyof ConnectionFormState>(
  key: K,
  value: ConnectionFormState[K],
) => void

export interface ConnectionFormDialogProps {
  mode: 'create' | 'edit'
  connectionForm: ConnectionFormState
  testData: ConnectionTestResponse | undefined
  error: Error | null
  testing: boolean
  saving: boolean
  onClose: () => void
  onChange: ConnectionFormChange
  onTest: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}
