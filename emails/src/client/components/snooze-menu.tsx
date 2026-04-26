import { CalendarIcon, Clock } from 'lucide-react'
import { type ReactElement, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import { getDefaultCustomSnooze, getSnoozeOptions } from '../lib/snooze-options'

interface SnoozeMenuProps {
  trigger: ReactElement
  onSnooze: (until: number) => void
  onUnsnooze?: () => void
  isSnoozed?: boolean
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}

function startOfDay(date: Date) {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return target
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function timeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

function combineDateAndTime(date: Date, value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  const target = new Date(date)
  target.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return target
}

function formatDateLabel(date: Date) {
  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (dateKey(date) === dateKey(today)) return 'Today'
  if (dateKey(date) === dateKey(tomorrow)) return 'Tomorrow'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatTimeLabel(value: string) {
  return combineDateAndTime(new Date(), value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getTimeOptions(date: Date) {
  const now = new Date()
  const today = dateKey(date) === dateKey(now)
  const options: string[] = []

  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(
        2,
        '0',
      )}`
      const candidate = combineDateAndTime(date, value)
      if (!today || candidate.getTime() > now.getTime() + 5 * 60_000) {
        options.push(value)
      }
    }
  }

  return options
}

export function SnoozeMenu({
  trigger,
  onSnooze,
  onUnsnooze,
  isSnoozed = false,
  align = 'end',
  side = 'top',
  tooltipSide = 'top',
}: SnoozeMenuProps) {
  const [customOpen, setCustomOpen] = useState(false)
  const defaultCustom = useMemo(() => getDefaultCustomSnooze(), [])
  const [customDate, setCustomDate] = useState(startOfDay(defaultCustom))
  const [customTime, setCustomTime] = useState(timeValue(defaultCustom))
  const presets = getSnoozeOptions()
  const timeOptions = getTimeOptions(customDate)
  const selectedUntil = combineDateAndTime(customDate, customTime)
  const canSave = selectedUntil.getTime() > Date.now()

  useEffect(() => {
    if (timeOptions.length === 0) return
    if (!timeOptions.includes(customTime)) setCustomTime(timeOptions[0]!)
  }, [customDate, customTime, timeOptions])

  const applyCustom = () => {
    if (!canSave) return
    onSnooze(selectedUntil.getTime())
    setCustomOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>Snooze</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align={align} side={side} className="w-48">
          {isSnoozed && onUnsnooze ? (
            <DropdownMenuItem
              className="cursor-pointer text-[13px]"
              onClick={onUnsnooze}
            >
              Unsnooze
            </DropdownMenuItem>
          ) : null}
          {presets.map((option) => (
            <DropdownMenuItem
              key={option.id}
              className="cursor-pointer text-[13px]"
              onClick={() => onSnooze(option.until)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            className="cursor-pointer justify-between text-[13px]"
            onClick={() => window.setTimeout(() => setCustomOpen(true), 0)}
          >
            <span>Custom...</span>
            <span className="text-muted-foreground text-xs">M</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent
          className="!top-[clamp(7rem,16vh,11rem)] gap-7 sm:max-w-[34rem] [@media(max-height:760px)]:!top-0"
          style={{
            translate: '-50% 0',
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-3xl font-semibold tracking-normal">
              Snooze
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-semibold">
                When
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full cursor-pointer justify-between rounded-lg bg-transparent px-3 text-left text-sm font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="text-muted-foreground size-4" />
                      {formatDateLabel(customDate)}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={(date) => date && setCustomDate(startOfDay(date))}
                    disabled={{ before: startOfDay(new Date()) }}
                    className="rounded-lg"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-semibold">
                Time
              </p>
              <Select value={customTime} onValueChange={setCustomTime}>
                <SelectTrigger className="h-10 w-full rounded-lg bg-transparent">
                  <span className="flex items-center gap-2">
                    <Clock className="text-muted-foreground size-4" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="max-h-[min(16rem,calc(100vh-var(--chat-safe-padding,0px)-var(--emails-action-dock-safe-padding,0px)-10rem))] overflow-y-auto"
                >
                  {timeOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatTimeLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer rounded-lg px-5"
              onClick={() => setCustomOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn('h-10 cursor-pointer rounded-lg px-6')}
              disabled={!canSave}
              onClick={applyCustom}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
