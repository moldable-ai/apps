import { FileText, Upload, X } from 'lucide-react'
import { type DragEvent, useRef, useState } from 'react'
import { cn } from '@moldable-ai/ui'
import type { TaskAttachment } from '@/shared/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_ATTACHMENTS = 10

export function AttachmentUpload({
  attachments,
  disabled = false,
  onUploadFile,
  onChange,
}: {
  attachments: TaskAttachment[]
  disabled?: boolean
  onUploadFile?: (file: File) => Promise<TaskAttachment>
  onChange: (attachments: TaskAttachment[]) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = async (files: FileList | File[]) => {
    if (disabled) return
    setError(null)

    const incoming = Array.from(files).slice(
      0,
      MAX_ATTACHMENTS - attachments.length,
    )
    const tooLarge = incoming.find((file) => file.size > MAX_FILE_SIZE)
    if (tooLarge) {
      setError(`${tooLarge.name} is larger than 10MB.`)
      return
    }

    try {
      const uploaded = await Promise.all(
        incoming.map((file) =>
          onUploadFile ? onUploadFile(file) : fileToAttachment(file),
        ),
      )
      onChange([...attachments, ...uploaded].slice(0, MAX_ATTACHMENTS))
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Failed to attach file.',
      )
    }
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files.length > 0) {
      void addFiles(event.dataTransfer.files)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files)
          event.currentTarget.value = ''
        }}
      />
      <button
        type="button"
        disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-border/70 text-muted-foreground flex min-h-28 w-full cursor-pointer items-center justify-center rounded-md border border-dashed transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          isDragging && 'border-primary bg-primary/10 text-primary',
        )}
      >
        <span className="text-center">
          <Upload className="mx-auto mb-2 size-4" />
          <span className="block text-sm">
            Drop files or click to upload (max 10MB)
          </span>
          <span className="mt-1 block text-xs">
            (note: attachments save automatically)
          </span>
        </span>
      </button>

      {attachments.length > 0 ? (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="border-border bg-card flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs"
            >
              <FileText className="text-muted-foreground size-3.5 shrink-0" />
              <button
                type="button"
                onClick={() => openAttachment(attachment)}
                className="hover:text-primary min-w-0 flex-1 cursor-pointer truncate text-left"
              >
                {attachment.name}
              </button>
              <span className="text-muted-foreground shrink-0">
                {formatFileSize(attachment.size)}
              </span>
              <button
                type="button"
                disabled={disabled}
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
                aria-label={`Remove ${attachment.name}`}
                onClick={() =>
                  onChange(
                    attachments.filter((item) => item.id !== attachment.id),
                  )
                }
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}

export function AttachmentList({
  attachments,
}: {
  attachments: TaskAttachment[]
}) {
  if (attachments.length === 0) return null

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <button
          type="button"
          key={attachment.id}
          onClick={() => openAttachment(attachment)}
          className="border-border bg-muted/30 hover:border-primary/50 hover:text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
        >
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {formatFileSize(attachment.size)}
          </span>
        </button>
      ))}
    </div>
  )
}

function openAttachment(attachment: TaskAttachment) {
  if (attachment.path && window.parent !== window) {
    window.parent.postMessage(
      {
        type: 'moldable:open-file',
        path: attachment.path,
      },
      '*',
    )
    return
  }

  if (!attachment.dataUrl) return

  const link = document.createElement('a')
  link.href = attachment.dataUrl
  link.download = attachment.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function fileToAttachment(file: File): Promise<TaskAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        id: `attachment-${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: String(reader.result),
        createdAt: new Date().toISOString(),
      })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
