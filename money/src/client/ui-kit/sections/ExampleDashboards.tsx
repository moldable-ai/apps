import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@moldable-ai/ui'
import { DEMO_DASHBOARDS } from '../data/demo'
import { Bento } from './Bento'

/**
 * Four themed example dashboards (Overview, FIRE, Cash Flow, Debt) built from a
 * single coherent demo persona — showing how the same card legos compose into
 * very different dashboards depending on a user's focus.
 */
export function ExampleDashboards() {
  const [active, setActive] = useState(DEMO_DASHBOARDS[0].id)
  const current =
    DEMO_DASHBOARDS.find((d) => d.id === active) ?? DEMO_DASHBOARDS[0]

  return (
    <Tabs value={active} onValueChange={setActive} className="gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <TabsList
          variant="line"
          className="scrollbar-hide max-w-full justify-start overflow-x-auto"
        >
          {DEMO_DASHBOARDS.map((d) => (
            <TabsTrigger
              key={d.id}
              value={d.id}
              className="whitespace-nowrap text-sm"
            >
              {d.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <p className="text-muted-foreground text-sm sm:max-w-md">
          {current.description}
        </p>
      </div>

      {DEMO_DASHBOARDS.map((d) => (
        <TabsContent key={d.id} value={d.id} className="mt-0">
          <Bento cards={d.cards} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
