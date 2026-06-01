import { Check } from 'lucide-react'
import {
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  cn,
} from '@moldable-ai/ui'
import type { ChapterRef } from '../../shared/book'

interface TocDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chapters: ChapterRef[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function TocDrawer({
  open,
  onOpenChange,
  chapters,
  currentIndex,
  onSelect,
}: TocDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-full max-w-sm flex-col gap-0 p-0"
        style={{ maxHeight: '100dvh' }}
      >
        <SheetHeader className="border-border border-b px-5 py-4">
          <SheetTitle>Contents</SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <ul className="flex flex-col px-2 py-3 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)]">
            {chapters.map((chapter) => {
              const active = chapter.index === currentIndex
              return (
                <li key={chapter.index}>
                  <button
                    type="button"
                    onClick={() => onSelect(chapter.index)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <span className="text-muted-foreground mt-px w-6 shrink-0 text-right text-xs tabular-nums">
                      {chapter.index + 1}
                    </span>
                    <span className="min-w-0 flex-1 leading-snug">
                      {chapter.title}
                    </span>
                    {active ? (
                      <Check
                        className="text-primary mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
