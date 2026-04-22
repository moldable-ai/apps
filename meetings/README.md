# Meetings 🎙️

A simple meeting recorder with real-time transcription powered by Deepgram.

## Features

- **Real-time transcription** - See what's being said as it happens
- **Speaker diarization** - Automatically identify different speakers
- **Local storage** - All transcripts are saved locally in real-time
- **Optional audio saving** - Save the audio file alongside the transcript
- **Export to Markdown** - Export transcripts for use anywhere
- **Multiple languages** - Support for 12+ languages
- **Multiple models** - Choose between Nova 2, Nova 3, or Nova 3 Medical

## Setup

1. Get a Deepgram API key from [console.deepgram.com](https://console.deepgram.com/)
2. Store it in Moldable Settings > Vault as `DEEPGRAM_API_KEY`.
3. Launch the app from Moldable. The desktop app manages the Vite/Hono
   runtime and passes the active workspace context to API requests.

## How It Works

1. **Recording**: Click the microphone button to start recording. The app captures audio from your microphone.

2. **Transcription**: Audio is streamed in real-time to Deepgram's API, which returns transcribed text as you speak.

3. **Storage**: Transcripts are automatically saved to workspace-scoped JSON
   files as segments arrive. No data is lost even if you close the browser.

4. **Playback**: View past meetings and their full transcripts. Export to Markdown for sharing or archival.

## Architecture

```
src/
├── client/
│   ├── app.tsx              # Main app
│   ├── widget.tsx           # Dashboard widget
│   └── query-provider.tsx   # React Query provider
├── components/
│   ├── recording-controls   # Record/pause/stop UI
│   ├── transcript-view      # Live/static transcript display
│   ├── meeting-list         # Sidebar meeting list
│   └── settings-panel       # Configuration options
├── hooks/
│   ├── use-audio-recorder   # MediaRecorder wrapper
│   ├── use-deepgram         # WebSocket to Deepgram
│   └── use-meetings         # Meeting CRUD
├── lib/
│   ├── format               # Time/date formatting
│   └── storage.server       # Workspace-aware filesystem storage
├── server/
│   ├── app.ts               # Hono API routes
│   └── index.ts             # Vite/Hono runtime entry
└── types/
    └── meeting              # TypeScript types
```

## Settings

- **Save Audio**: When enabled, saves the audio file alongside the transcript
- **Speaker Detection**: Uses Deepgram's diarization to identify speakers
- **Model**: Choose transcription accuracy vs speed
- **Language**: Select the primary language being spoken

## Data Storage

All data is stored under the active Moldable workspace:

- `meetings/{id}.json` - One file per meeting with transcript and notes
- `settings.json` - User preferences

Transcripts are saved incrementally as segments arrive, so nothing is lost even during long meetings.
