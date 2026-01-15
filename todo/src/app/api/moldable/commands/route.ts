import { NextResponse } from 'next/server'
import type { AppCommand, CommandsResponse } from '@moldable-ai/ui'

export const dynamic = 'force-dynamic'

/**
 * Returns available commands for this app.
 * The desktop fetches this to populate the Cmd+K menu when this app is active.
 */
export async function GET(): Promise<NextResponse<CommandsResponse>> {
  const commands: AppCommand[] = [
    {
      id: 'add-todo',
      label: 'Add todo',
      shortcut: 'n',
      icon: 'plus',
      group: 'Actions',
      action: { type: 'message', payload: { focus: 'add-input' } },
    },
    {
      id: 'filter-all',
      label: 'Show all todos',
      group: 'Filter',
      action: { type: 'message', payload: { filter: 'all' } },
    },
    {
      id: 'filter-active',
      label: 'Show active todos',
      group: 'Filter',
      action: { type: 'message', payload: { filter: 'active' } },
    },
    {
      id: 'filter-completed',
      label: 'Show completed todos',
      group: 'Filter',
      action: { type: 'message', payload: { filter: 'completed' } },
    },
    {
      id: 'clear-completed',
      label: 'Clear completed todos',
      icon: 'trash-2',
      group: 'Actions',
      action: { type: 'message', payload: { action: 'clear-completed' } },
    },
  ]

  return NextResponse.json(
    { commands },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
