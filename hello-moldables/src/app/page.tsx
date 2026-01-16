'use client'

import { useEffect, useState } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 Try changing these!
// ═══════════════════════════════════════════════════════════════════════════════

const WELCOME_MESSAGE = 'Welcome!'
const YOUR_NAME = 'friend'

// ═══════════════════════════════════════════════════════════════════════════════

const prompts = [
  {
    id: 1,
    text: "Change the title to 'Welcome, " + YOUR_NAME + "!'",
    hint: 'Personalize the greeting',
  },
  {
    id: 2,
    text: 'Add a 5 sec countdown timer that shows confetti',
    prompt: 'Add a 5 sec countdown timer that shows the confetti emoji icon',
    hint: 'Add focus controls',
  },
]

/**
 * Send a prompt to Moldable's chat input
 */
function sendToChatInput(text: string) {
  window.parent.postMessage({ type: 'moldable:set-chat-input', text }, '*')
}

function useModKey() {
  const [isMac, setIsMac] = useState(true)
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])
  return isMac ? '⌘' : 'Ctrl'
}

export default function HelloMoldables() {
  const modKey = useModKey()

  return (
    <div className="bg-background text-foreground selection:bg-primary/10 min-h-screen p-8 pb-[var(--chat-safe-padding)]">
      <div className="mx-auto max-w-lg">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <span className="animate-wave inline-block origin-[70%_70%]">👋</span>
          {WELCOME_MESSAGE}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Hey {YOUR_NAME} — you&apos;re a Moldable now. You have powers, and
          that&apos;s pretty cool.
        </p>

        <div className="mt-12">
          <p className="text-foreground/80 mb-5 text-sm font-medium">
            With Moldable, you can build or tweak any app to your liking:
          </p>
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => sendToChatInput(prompt.prompt ?? prompt.text)}
                className="border-border/40 bg-card/20 hover:border-primary/30 hover:bg-primary/5 flex w-full cursor-pointer items-start gap-4 rounded-xl border p-4 text-left transition-colors"
              >
                <span className="bg-primary/10 text-primary ring-primary/20 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset">
                  {prompt.id}
                </span>
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-medium leading-tight">
                    {prompt.text}
                  </p>
                  <p className="text-muted-foreground/70 text-xs">
                    {prompt.hint}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-muted-foreground/50 mt-6 text-center text-[11px] italic">
            Click one to send it to the chat...
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3">
          <div className="border-border bg-card/50 flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-sm">
            <span className="text-muted-foreground text-[11px] font-medium">
              Press
            </span>
            <kbd className="bg-muted text-foreground ring-border flex h-5 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold ring-1 ring-inset">
              {modKey}
            </kbd>
            <span className="text-muted-foreground text-[10px] font-bold">
              +
            </span>
            <kbd className="bg-muted text-foreground ring-border flex h-5 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold ring-1 ring-inset">
              M
            </kbd>
            <span className="text-muted-foreground whitespace-nowrap text-[11px] font-medium">
              to summon me
            </span>
          </div>

          <div className="border-border bg-card/50 flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-sm">
            <span className="text-muted-foreground text-[11px] font-medium">
              Press
            </span>
            <kbd className="bg-muted text-foreground ring-border flex h-5 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold ring-1 ring-inset">
              {modKey}
            </kbd>
            <span className="text-muted-foreground text-[10px] font-bold">
              +
            </span>
            <kbd className="bg-muted text-foreground ring-border flex h-5 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold ring-1 ring-inset">
              K
            </kbd>
            <span className="text-muted-foreground whitespace-nowrap text-[11px] font-medium">
              to navigate around
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
