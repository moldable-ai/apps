import { Mail } from 'lucide-react'
import { errorMessage } from '../lib/mail-format'

export function ConnectScreen({
  error,
  onConnect,
}: {
  error: unknown
  onConnect: () => void
}) {
  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      <BackgroundGlow />

      <section className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-8 text-center">
        <div className="bg-primary/10 mb-6 rounded-full p-4">
          <Mail className="text-primary size-12" />
        </div>

        <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          Emails
        </h1>

        <p className="text-muted-foreground mb-8 max-w-sm">
          Connect your Gmail account to read and triage mail from this
          workspace.
        </p>

        {error ? (
          <div className="border-destructive/50 bg-destructive/10 text-destructive mb-4 rounded-lg border p-4 text-sm">
            {errorMessage(error)}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onConnect}
          className="flex h-10 cursor-pointer items-center gap-3 rounded-sm border border-[#747775] bg-white px-3 font-['Roboto',sans-serif] text-sm font-medium text-[#1f1f1f] shadow-sm transition-shadow hover:shadow-md active:bg-[#f8f8f8]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        <p className="text-muted-foreground mt-6 max-w-xs text-center text-xs">
          Your mail data is stored locally on your device.{' '}
          <a
            href="https://moldable.sh/legal/privacy#7-google-api-services"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Privacy Policy
          </a>
        </p>
      </section>
    </main>
  )
}

function BackgroundGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="bg-primary/10 absolute left-1/2 top-[-20%] size-[48rem] -translate-x-1/2 rounded-full blur-3xl" />
      <div className="bg-accent/20 absolute left-[20%] top-[30%] size-[24rem] rounded-full blur-3xl" />
    </div>
  )
}
