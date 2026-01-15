# Todo

A simple, elegant todo app built with Next.js 15.

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

Open [http://localhost:3000](http://localhost:3000) to see the full app.

Open [http://localhost:3000/widget](http://localhost:3000/widget) for the widget view.

## Tech Stack

- **Framework**: Next.js 15 + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State Management**: TanStack Query
- **Storage**: File-based JSON

## Project Structure

```
src/
├── app/
│   ├── api/todos/       # API routes for CRUD
│   ├── widget/          # Widget view
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Main app
│   └── globals.css      # Global styles
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
