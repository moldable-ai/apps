'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface Toast {
  id: number
  message: string
  icon?: ReactNode
  variant?: 'default' | 'error'
}

/**
 * A minimal, self-contained toast queue. Returns a `notify` callback plus the
 * rendered viewport so the app can drop confirmations ("Copied!", save errors)
 * without pulling in a heavier dependency.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, options?: Pick<Toast, 'icon' | 'variant'>) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, ...options }])
      return id
    },
    [],
  )

  return { toasts, notify, dismiss }
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: number) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 2400)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={
        toast.variant === 'error'
          ? 'bg-destructive text-destructive-foreground flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg'
          : 'bg-foreground text-background flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg'
      }
      role="status"
      aria-live="polite"
    >
      {toast.icon}
      <span>{toast.message}</span>
    </motion.div>
  )
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--chat-safe-padding,0px)+1.5rem)] z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
