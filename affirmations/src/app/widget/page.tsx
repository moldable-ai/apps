'use client'

import { useEffect, useState } from 'react'
import { categories, getAffirmations } from '@/lib/affirmations'
import { motion } from 'framer-motion'

export default function AffirmationsWidget() {
  const [affirmation, setAffirmation] = useState('')
  const [category, setCategory] = useState(categories[0])

  useEffect(() => {
    const randomCat = categories[Math.floor(Math.random() * categories.length)]
    const list = getAffirmations(randomCat.id)
    const randomAff = list[Math.floor(Math.random() * list.length)]
    setCategory(randomCat)
    setAffirmation(randomAff)
  }, [])

  if (!affirmation) return null

  const Icon = category.icon

  return (
    <div className="bg-background relative flex h-full w-full flex-col justify-between overflow-hidden p-6">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
          <Icon size={16} style={{ color: category.accent }} />
        </div>
        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.15em]">
          {category.name}
        </span>
      </div>

      <div className="flex flex-1 items-center">
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-foreground line-clamp-3 text-xl font-semibold leading-tight tracking-tight"
        >
          {affirmation}
        </motion.p>
      </div>

      <div className="text-muted-foreground/60 text-[10px] font-medium">
        Reflect & Ritual
      </div>
    </div>
  )
}
