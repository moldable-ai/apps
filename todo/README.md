# Todo

A simple, elegant todo app built with Vite, Hono, and React 19.

## Features

- ✅ Create, edit, and delete todos
- 🎯 Priority levels (low, medium, high)
- 🔍 Filter by status (all, active, completed)
- 💾 Persistent storage (JSON file)
- 🎨 Light/dark theme support
- 📱 Widget view for quick glance

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open the local URL printed by `pnpm dev` to see the full app.

Open `/widget` on that local URL for the widget view.

## Tech Stack

- **Framework**: Vite + Hono + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State Management**: TanStack Query
- **Storage**: File-based JSON

## Project Structure

```
src/
├── client/
│   ├── app.tsx          # Main app view
│   ├── widget.tsx       # Widget view
│   └── globals.css      # Global styles
├── server/
│   ├── app.ts           # Hono API routes
│   └── index.ts         # Server entry
├── components/
│   ├── add-todo.tsx     # Add todo form
│   ├── empty-state.tsx  # Empty state display
│   └── todo-item.tsx    # Individual todo item
├── hooks/
│   └── use-todos.ts     # Todo data hooks
└── lib/
    ├── query-provider.tsx
    └── types.ts         # TypeScript types
```
