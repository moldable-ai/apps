'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { MarkdownEditor } from '@moldable-ai/editor'
import { cn } from '@moldable-ai/ui'

interface EnhancingEditorProps {
  originalNotes: string
  enhancedContent: string
  isEnhancing: boolean
  className?: string
}

export function EnhancingEditor({
  originalNotes,
  enhancedContent,
  isEnhancing,
  className,
}: EnhancingEditorProps) {
  return (
    <div className={cn('pointer-events-none relative min-h-full', className)}>
      <div className="relative z-10 opacity-55">
        <MarkdownEditor
          value={originalNotes}
          onChange={() => undefined}
          placeholder="Manual notes will appear here..."
          disabled
          minHeight="100%"
          maxHeight="none"
          hideMarkdownHint
        />
      </div>

      <div className="bg-background absolute inset-x-0 top-0 z-20">
        <div className="meetings-enhanced-content">
          <MarkdownEditor
            value={enhancedContent}
            onChange={() => undefined}
            placeholder=""
            disabled
            minHeight="100%"
            maxHeight="none"
            hideMarkdownHint
          />
        </div>

        <div className="meetings-enhance-gradient">
          <div className="meetings-enhance-bar border-primary/25 bg-background/95 text-primary shadow-primary/10 shadow-lg">
            {isEnhancing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span>
              {isEnhancing ? 'Enhancing notes...' : 'Enhanced draft ready'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
