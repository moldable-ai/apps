// Shared history entry shape used by the server store, the RPC surface, and the
// client. Conversions and calculations live in one timeline so the chat (and
// the History tab) see a single stream.

export type HistoryKind = 'calc' | 'convert'

export interface HistoryEntry {
  id: string
  kind: HistoryKind
  // Human-readable left side: "sin(45) + 2" or "100 USD → EUR".
  expression: string
  // Human-readable right side: "92" or "92 EUR".
  result: string
  // Raw numeric result, for callers that want the value not the label.
  resultValue: number
  createdAt: string
}
