import type { ComponentProps } from 'react'
import { Button, cn } from '@moldable-ai/ui'

export function AppButton({
  className,
  variant,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant={variant}
      className={cn(
        'cursor-pointer rounded-lg',
        variant === 'outline' && 'border-border bg-card hover:bg-accent',
        className,
      )}
      {...props}
    />
  )
}
