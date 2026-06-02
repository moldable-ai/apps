'use client'

import { ImagePlus, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import {
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@moldable-ai/ui'
import type { MediaResult } from '../../lib/types'

interface AddPlantProps {
  open: boolean
  onClose: () => void
  uploadFile: (f: File) => Promise<MediaResult>
  createManual: (input: {
    commonName: string
    scientificName?: string
    room?: string
    heroImagePath?: string
  }) => Promise<void>
  sendToChatIdentify: (args: { absPath?: string; relPath: string }) => void
}

function imageFilesFromList(list: FileList | File[]): File[] {
  return Array.from(list).filter(
    (file) =>
      /\.(png|jpe?g|gif|webp)$/i.test(file.name) ||
      ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
        file.type,
      ),
  )
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

export function AddPlant({
  open,
  onClose,
  uploadFile,
  createManual,
  sendToChatIdentify,
}: AddPlantProps) {
  const [tab, setTab] = useState<'photo' | 'manual'>('photo')

  // From-photo state
  const [uploaded, setUploaded] = useState<MediaResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  // Manual state
  const [commonName, setCommonName] = useState('')
  const [scientificName, setScientificName] = useState('')
  const [room, setRoom] = useState('')
  const [saving, setSaving] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  // Reset everything when the dialog closes so it opens clean next time.
  useEffect(() => {
    if (open) return
    setTab('photo')
    setUploaded(null)
    setUploading(false)
    setDragging(false)
    setPhotoError(null)
    setCommonName('')
    setScientificName('')
    setRoom('')
    setSaving(false)
    setManualError(null)
    dragDepth.current = 0
  }, [open])

  const upload = useCallback(
    async (file: File) => {
      setUploading(true)
      setPhotoError(null)
      try {
        const media = await uploadFile(file)
        setUploaded(media)
      } catch (e) {
        setPhotoError(
          e instanceof Error ? e.message : "Couldn't add that photo",
        )
      } finally {
        setUploading(false)
      }
    },
    [uploadFile],
  )

  const onDrop = (event: DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const file = imageFilesFromList(event.dataTransfer.files)[0]
    if (file) void upload(file)
    else setPhotoError('Use a PNG, JPEG, WebP, or GIF image.')
  }

  const onPaste = (event: ClipboardEvent) => {
    const file = imageFilesFromList(
      Array.from(event.clipboardData.files ?? []),
    )[0]
    if (file) {
      event.preventDefault()
      void upload(file)
    } else if (event.clipboardData.files.length > 0) {
      event.preventDefault()
      setPhotoError('Use a PNG, JPEG, WebP, or GIF image.')
    }
  }

  const onIdentify = () => {
    if (!uploaded) return
    sendToChatIdentify({ absPath: uploaded.absPath, relPath: uploaded.path })
    onClose()
  }

  const onManualSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const name = commonName.trim()
    if (!name) {
      setManualError('Enter a name.')
      return
    }
    setSaving(true)
    setManualError(null)
    try {
      await createManual({
        commonName: name,
        scientificName: scientificName.trim() || undefined,
        room: room.trim() || undefined,
      })
      onClose()
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Couldn't add plant.")
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] flex max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-border border-b px-5 py-4">
          <DialogTitle>Add plant</DialogTitle>
          <DialogDescription>
            Identify from a photo, or enter the details yourself.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'photo' | 'manual')}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="px-5 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="photo" className="flex-1 cursor-pointer">
                From photo
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 cursor-pointer">
                Manual
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ---- From photo ---- */}
          <TabsContent
            value="photo"
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4"
          >
            <div
              onDragEnter={(e) => {
                if (!hasFiles(e)) return
                e.preventDefault()
                dragDepth.current += 1
                setDragging(true)
              }}
              onDragOver={(e) => {
                if (!hasFiles(e)) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
              }}
              onDragLeave={(e) => {
                if (!hasFiles(e)) return
                e.preventDefault()
                dragDepth.current = Math.max(0, dragDepth.current - 1)
                if (dragDepth.current === 0) setDragging(false)
              }}
              onDrop={onDrop}
              onPaste={onPaste}
              className="group relative"
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const supported = imageFilesFromList([file])[0]
                    if (supported) void upload(supported)
                    else setPhotoError('Use a PNG, JPEG, WebP, or GIF image.')
                  }
                  e.target.value = ''
                }}
              />

              {uploaded ? (
                <div className="border-border relative aspect-[4/3] w-full overflow-hidden rounded-xl border">
                  <img
                    src={`/api/plants/media?path=${encodeURIComponent(uploaded.path)}`}
                    alt={uploaded.altText || 'Plant photo'}
                    className="size-full object-cover"
                  />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Replace photo"
                      className="size-8 cursor-pointer rounded-full"
                      onClick={() => inputRef.current?.click()}
                    >
                      <ImagePlus className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Remove photo"
                      className="size-8 cursor-pointer rounded-full"
                      onClick={() => setUploaded(null)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="size-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    'flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors',
                    dragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-muted/30 hover:border-foreground/30 hover:bg-muted/50',
                  )}
                >
                  {uploading ? (
                    <Loader2 className="text-muted-foreground size-7 animate-spin" />
                  ) : (
                    <ImagePlus className="text-muted-foreground size-7" />
                  )}
                  <span className="text-foreground text-sm font-medium">
                    {dragging ? 'Drop to add photo' : 'Add a photo'}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Drag &amp; drop, paste, or click to upload
                  </span>
                </button>
              )}

              {photoError && (
                <p className="text-destructive mt-2 text-xs">{photoError}</p>
              )}
            </div>

            <p className="text-muted-foreground mt-4 text-xs">
              Identification runs in chat. We&apos;ll then generate a care
              schedule for you.
            </p>

            <Button
              type="button"
              className="mt-4 w-full cursor-pointer"
              disabled={!uploaded || uploading}
              onClick={onIdentify}
            >
              <Sparkles className="mr-1.5 size-4" />
              Identify with chat
            </Button>
          </TabsContent>

          {/* ---- Manual ---- */}
          <TabsContent
            value="manual"
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4"
          >
            <form onSubmit={onManualSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plant-common-name">Name</Label>
                <Input
                  id="plant-common-name"
                  value={commonName}
                  onChange={(e) => setCommonName(e.target.value)}
                  placeholder="Snake plant"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plant-scientific-name">
                  Scientific name{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="plant-scientific-name"
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  placeholder="Dracaena trifasciata"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plant-room">
                  Room{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="plant-room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Living room"
                />
              </div>

              {manualError && (
                <p className="text-destructive text-xs">{manualError}</p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={onClose}
                  disabled={saving}
                >
                  <X className="mr-1 size-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer"
                  disabled={saving || !commonName.trim()}
                >
                  {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                  Add plant
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
