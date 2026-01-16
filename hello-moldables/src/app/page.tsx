'use client'

import {
  Check,
  ChevronRight,
  MessageSquare,
  PartyPopper,
  Rocket,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@moldable-ai/ui'

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 TUTORIAL STEPS - This is what you'll modify!
// ═══════════════════════════════════════════════════════════════════════════════

const WELCOME_EMOJI = '👋' // Try changing me to: 🚀, 🎉, ✨, 🌟, or 🎮
const WELCOME_TITLE = 'Hello, Moldable!' // Try: "Welcome to the Future!" or your name
const ACCENT_COLOR = 'purple' // Try: 'blue', 'green', 'orange', 'pink', 'cyan'

// ═══════════════════════════════════════════════════════════════════════════════

const colorMap = {
  purple: {
    gradient: 'from-purple-600 via-violet-500 to-fuchsia-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
  blue: {
    gradient: 'from-blue-600 via-cyan-500 to-teal-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  green: {
    gradient: 'from-green-600 via-emerald-500 to-teal-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    glow: 'shadow-green-500/20',
  },
  orange: {
    gradient: 'from-orange-600 via-amber-500 to-yellow-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/20',
  },
  pink: {
    gradient: 'from-pink-600 via-rose-500 to-red-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    glow: 'shadow-pink-500/20',
  },
  cyan: {
    gradient: 'from-cyan-600 via-sky-500 to-blue-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/20',
  },
}

const tutorialSteps = [
  {
    id: 1,
    title: 'Change the Emoji',
    description:
      'Open the chat and ask: "Change the welcome emoji to a rocket 🚀"',
    icon: Sparkles,
    hint: 'Look for WELCOME_EMOJI in the code',
  },
  {
    id: 2,
    title: 'Personalize the Title',
    description: 'Try: "Change the title to say Hello [Your Name]!"',
    icon: MessageSquare,
    hint: 'The WELCOME_TITLE variable controls this',
  },
  {
    id: 3,
    title: 'Switch the Color Theme',
    description:
      'Ask: "Make the accent color blue" or try green, orange, pink!',
    icon: Wand2,
    hint: 'ACCENT_COLOR can be: purple, blue, green, orange, pink, cyan',
  },
  {
    id: 4,
    title: 'Go Wild!',
    description:
      'Now try: "Turn this into a simple clicker game" or "Add a dark mode toggle"',
    icon: Rocket,
    hint: 'You can transform this app into anything you imagine!',
  },
]

function Confetti() {
  const [pieces, setPieces] = useState<
    Array<{ id: number; left: number; delay: number; color: string }>
  >([])

  useEffect(() => {
    const colors = [
      '#a855f7',
      '#ec4899',
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
    ]
    const newPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    setPieces(newPieces)

    const timer = setTimeout(() => setPieces([]), 4000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            backgroundColor: piece.color,
            width: '10px',
            height: '10px',
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </>
  )
}

export default function HelloMoldables() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const colors =
    colorMap[ACCENT_COLOR as keyof typeof colorMap] || colorMap.purple

  const toggleStep = (stepId: number) => {
    setCompletedSteps((prev) => {
      const newSteps = prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId]

      // Show confetti when all steps completed
      if (newSteps.length === tutorialSteps.length && !prev.includes(stepId)) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 100)
      }

      return newSteps
    })
  }

  const allComplete = completedSteps.length === tutorialSteps.length

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {showConfetti && <Confetti />}

      {/* Ambient background glow */}
      <div
        className={cn(
          'absolute inset-0 opacity-30',
          `bg-gradient-to-br ${colors.gradient}`,
          'animate-gradient blur-3xl',
        )}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-8">
        {/* Header Section - Keep near top so chat doesn't cover it */}
        <header className="mb-8 text-center">
          <div
            className={cn(
              'animate-float mb-4 inline-block text-7xl',
              'drop-shadow-2xl',
            )}
          >
            {WELCOME_EMOJI}
          </div>

          <h1
            className={cn(
              'mb-3 text-4xl font-bold',
              'bg-clip-text text-transparent',
              `bg-gradient-to-r ${colors.gradient}`,
            )}
          >
            {WELCOME_TITLE}
          </h1>

          <p className="mx-auto max-w-md text-lg text-zinc-400">
            Congrats, you&apos;re one of us now! 🎉
            <br />
            <span className="text-sm text-zinc-500">
              Welcome to the Moldables — people who build apps with AI
            </span>
          </p>
        </header>

        {/* What is Moldable */}
        <section
          className={cn(
            'mb-6 rounded-2xl p-5',
            colors.bg,
            'border',
            colors.border,
            'backdrop-blur-sm',
          )}
        >
          <h2 className={cn('mb-2 text-lg font-semibold', colors.text)}>
            ✨ What is Moldable?
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300">
            Moldable lets you{' '}
            <strong>build and modify apps using natural language</strong>. Just
            open the chat (click the icon in the bottom-right or press{' '}
            <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">⌘K</kbd>)
            and describe what you want. The AI will edit the code for you in
            real-time!
          </p>
        </section>

        {/* Tutorial Steps */}
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-200">
            <Wand2 className={cn('h-5 w-5', colors.text)} />
            Try These Modifications
          </h2>

          <div className="space-y-3">
            {tutorialSteps.map((step) => {
              const isComplete = completedSteps.includes(step.id)
              const Icon = step.icon

              return (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step.id)}
                  className={cn(
                    'w-full rounded-xl p-4 text-left transition-all duration-300',
                    'border backdrop-blur-sm',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    isComplete
                      ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                        'transition-colors duration-300',
                        isComplete
                          ? `${colors.bg} ${colors.text}`
                          : 'bg-zinc-800 text-zinc-400',
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-medium',
                            isComplete ? colors.text : 'text-zinc-200',
                          )}
                        >
                          {step.title}
                        </span>
                        {isComplete && (
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                            Done!
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {step.description}
                      </p>
                      <p className="mt-1 text-xs italic text-zinc-600">
                        💡 {step.hint}
                      </p>
                    </div>

                    <ChevronRight
                      className={cn(
                        'h-5 w-5 flex-shrink-0 transition-transform',
                        isComplete
                          ? `${colors.text} rotate-90`
                          : 'text-zinc-600',
                      )}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Completion Message */}
        {allComplete && (
          <section
            className={cn(
              'rounded-2xl p-6 text-center',
              `bg-gradient-to-r ${colors.gradient}`,
              'animate-pulse-glow',
            )}
          >
            <PartyPopper className="mx-auto mb-3 h-12 w-12 text-white" />
            <h2 className="mb-2 text-2xl font-bold text-white">
              You&apos;re a Natural! 🌟
            </h2>
            <p className="text-sm text-white/90">
              You&apos;ve mastered the basics! Now try asking the AI to
              transform this into something completely different — a game, a
              tool, or anything you can imagine.
            </p>
          </section>
        )}

        {/* Footer hint */}
        <footer className="mt-8 text-center text-sm text-zinc-600">
          <p>
            Open the chat with{' '}
            <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              ⌘K
            </kbd>{' '}
            to start modifying this app
          </p>
        </footer>
      </div>
    </div>
  )
}
