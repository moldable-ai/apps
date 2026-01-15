'use client'

import { Plus } from 'lucide-react'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Button, Input } from '@moldable-ai/ui'

interface AddTodoProps {
  onAdd: (title: string) => void
}

export interface AddTodoHandle {
  focus: () => void
}

export const AddTodo = forwardRef<AddTodoHandle, AddTodoProps>(function AddTodo(
  { onAdd },
  ref,
) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onAdd(title.trim())
      setTitle('')
      // Keep focus on input for rapid entry
      inputRef.current?.focus()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a new todo..."
        className="flex-1"
        autoFocus
      />
      <Button type="submit" disabled={!title.trim()} className="cursor-pointer">
        <Plus className="size-4" />
        Add
      </Button>
    </form>
  )
})
