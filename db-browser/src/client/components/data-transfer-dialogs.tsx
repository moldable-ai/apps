import { Download, Loader2, Upload } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moldable-ai/ui'
import type { ConnectionSummary, ExplorerSchema } from '../../shared/types'
import type { SelectedTable } from '../types'
import { DialogField } from './shared'

export type ExportFormat = 'csv' | 'jsonl'

export interface ImportRowsPayload {
  schema: string
  table: string
  format: ExportFormat
  columns: string[]
  sourceContent: string
  maxRows: number
}

export function ExportQueryDialog({
  defaultFilename,
  exporting,
  error,
  onClose,
  onExport,
}: {
  defaultFilename: string
  exporting: boolean
  error: Error | null
  onClose: () => void
  onExport: (format: ExportFormat, filename: string) => void
}) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [filename, setFilename] = useState(defaultFilename)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onExport(format, filename)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export query</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_104px]">
            <DialogField label="Filename">
              <Input
                className="h-8"
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
              />
            </DialogField>
            <DialogField label="Format">
              <Select
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="jsonl">JSONL</SelectItem>
                </SelectContent>
              </Select>
            </DialogField>
          </div>
          {error ? (
            <p className="text-destructive text-xs leading-5">
              {error.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={onClose}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="cursor-pointer"
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ImportRowsDialog({
  connection,
  schemas,
  selectedSchema,
  selectedTable,
  importing,
  error,
  onClose,
  onImport,
}: {
  connection: ConnectionSummary | null
  schemas: ExplorerSchema[]
  selectedSchema: string
  selectedTable: SelectedTable | null
  importing: boolean
  error: Error | null
  onClose: () => void
  onImport: (payload: ImportRowsPayload) => void
}) {
  const initialSchema =
    selectedTable?.schema || selectedSchema || schemas[0]?.name || ''
  const [schema, setSchema] = useState(initialSchema)
  const [table, setTable] = useState(selectedTable?.table ?? '')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [sourceContent, setSourceContent] = useState('')
  const [filename, setFilename] = useState('')
  const [columnsText, setColumnsText] = useState('')
  const [maxRows, setMaxRows] = useState('1000')
  const activeSchema = schemas.find((entry) => entry.name === schema)
  const tables = activeSchema?.tables ?? []
  const importDisabled = !connection || connection.policyMode === 'read-only'
  const columns = useMemo(
    () =>
      columnsText
        .split(',')
        .map((column) => column.trim())
        .filter(Boolean),
    [columnsText],
  )
  const previewRows = useMemo(
    () => previewSourceRows(sourceContent, format, columns),
    [columns, format, sourceContent],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (importDisabled) return
    onImport({
      schema,
      table,
      format,
      columns,
      sourceContent,
      maxRows: Math.max(
        1,
        Math.min(10000, Math.round(Number(maxRows) || 1000)),
      ),
    })
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const content = await file.text()
    const nextFormat = file.name.toLowerCase().endsWith('.jsonl')
      ? 'jsonl'
      : 'csv'
    setFilename(file.name)
    setFormat(nextFormat)
    setSourceContent(content)
    setColumnsText(inferColumns(content, nextFormat).join(', '))
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import rows</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DialogField label="Schema">
              <Select
                value={schema}
                onValueChange={(value) => {
                  setSchema(value)
                  setTable('')
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map((entry) => (
                    <SelectItem key={entry.name} value={entry.name}>
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogField>
            <DialogField label="Table">
              <Select value={table} onValueChange={setTable}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Choose table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((entry) => (
                    <SelectItem key={entry.name} value={entry.name}>
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogField>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_104px_104px]">
            <DialogField label="File">
              <Input
                type="file"
                accept=".csv,.jsonl,text/csv,application/jsonl"
                className="h-8"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </DialogField>
            <DialogField label="Format">
              <Select
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="jsonl">JSONL</SelectItem>
                </SelectContent>
              </Select>
            </DialogField>
            <DialogField label="Max rows">
              <Input
                type="number"
                min={1}
                max={10000}
                className="h-8"
                value={maxRows}
                onChange={(event) => setMaxRows(event.target.value)}
              />
            </DialogField>
          </div>

          <DialogField label="Columns">
            <Input
              className="h-8 font-mono text-xs"
              value={columnsText}
              onChange={(event) => setColumnsText(event.target.value)}
              placeholder="id, email, created_at"
            />
          </DialogField>

          <div className="bg-muted/20 rounded-md border">
            <div className="border-border/70 flex h-8 items-center justify-between border-b px-3">
              <span className="text-muted-foreground truncate text-xs">
                {filename || 'No file selected'}
              </span>
              <span className="text-muted-foreground text-xs">
                {previewRows.length} preview rows
              </span>
            </div>
            <div className="max-h-40 overflow-auto p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-5">
                {previewRows.length
                  ? previewRows.map((row) => JSON.stringify(row)).join('\n')
                  : 'Select a CSV or JSONL file.'}
              </pre>
            </div>
          </div>

          {importDisabled ? (
            <p className="text-destructive text-xs leading-5">
              This connection is read-only. Enable write or admin access before
              importing rows.
            </p>
          ) : error ? (
            <p className="text-destructive text-xs leading-5">
              {error.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={onClose}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="cursor-pointer"
              disabled={
                importing ||
                importDisabled ||
                !schema ||
                !table ||
                !sourceContent ||
                columns.length === 0
              }
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function inferColumns(source: string, format: ExportFormat) {
  if (format === 'jsonl') {
    const firstLine = source.split(/\r?\n/).find((line) => line.trim())
    if (!firstLine) return []
    try {
      const parsed = JSON.parse(firstLine) as unknown
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.keys(parsed)
        : []
    } catch {
      return []
    }
  }

  const firstLine = source.split(/\r?\n/)[0] ?? ''
  return parseCsvLine(firstLine)
}

function previewSourceRows(
  source: string,
  format: ExportFormat,
  columns: string[],
) {
  if (!source.trim() || columns.length === 0) return []
  if (format === 'jsonl') {
    return source
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .slice(0, 5)
      .map((line) => {
        try {
          return JSON.parse(line) as unknown
        } catch {
          return { error: 'Invalid JSONL row' }
        }
      })
  }

  const lines = source.split(/\r?\n/).filter((line) => line.trim())
  return lines.slice(1, 6).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(
      columns.map((column, index) => [column, values[index] ?? '']),
    )
  })
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  values.push(current.trim())
  return values
}
