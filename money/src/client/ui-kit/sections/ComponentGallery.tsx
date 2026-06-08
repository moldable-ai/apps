import { HERO_GRADIENT, categoryColor } from '../lib/colors'
import { formatMoney, formatPercent } from '../lib/format'
import { CardShell, DeltaBadge, HeroValue, MerchantChip } from '../cards'
import {
  BarList,
  ColumnChart,
  Donut,
  Legend,
  LineChart,
  ProgressBar,
  RingGauge,
  Sparkline,
  StackedBar,
} from '../charts'
import { GALLERY_CARDS } from '../data/demo'
import { Bento } from './Bento'
import { GalleryTile, SectionHeader } from './Shell'

const sampleLine = [
  185, 188, 187, 192, 195, 194, 199, 201, 200, 204, 207, 207.4,
]
const sampleCols = [-4, 9, 13, 7, 22, 27, 25, 32, 37, 35, 43, 49]
const allocation = [
  { label: 'US Stocks', value: 64 },
  { label: 'Intl', value: 20 },
  { label: 'Bonds', value: 9 },
  { label: 'Crypto', value: 11 },
  { label: 'Cash', value: 7 },
]

/**
 * The lego catalog: every card renderer, the card lifecycle states, and the raw
 * chart + value primitives an agent can compose into new cards.
 */
export function ComponentGallery() {
  return (
    <div className="space-y-10">
      {/* card kinds */}
      <div>
        <SectionHeader
          label="Cards"
          title="One renderer per card kind"
          description="Each dispatches off the typed value shape, then the card kind. Tap the ƒ on any card to flip it and read its formula."
        />
        <Bento
          cards={GALLERY_CARDS.map((card) => ({
            card,
            span: kindSpan(card.kind),
          }))}
        />
      </div>

      {/* states */}
      <div>
        <SectionHeader
          label="States"
          title="Loading, empty & error are built in"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CardShell title="Net Worth" state="loading" />
          <CardShell
            title="Shared Expenses"
            state="empty"
            emptyMessage="No reimbursements outstanding."
          />
          <CardShell
            title="Investments"
            state="error"
            errorMessage="Formula references unknown collection 'Hldgs'."
            onRetry={() => undefined}
          />
        </div>
      </div>

      {/* charts */}
      <div>
        <SectionHeader
          label="Primitives"
          title="Charts & value atoms"
          description="Hand-rolled SVG, theme-token driven, reduced-motion aware — no chart dependency."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GalleryTile label="Gradient line" className="sm:col-span-2">
            <LineChart
              values={sampleLine}
              height={140}
              showMinMax
              format={(n) => `$${Math.round(n)}K`}
            />
          </GalleryTile>

          <GalleryTile label="Ring gauge">
            <div className="flex items-center justify-center">
              <RingGauge
                value={0.22}
                size={120}
                center={
                  <>
                    <div className="uk-nums text-xl font-semibold">22%</div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      saved
                    </div>
                  </>
                }
              />
            </div>
          </GalleryTile>

          <GalleryTile label="Allocation donut" className="sm:col-span-2">
            <div className="flex items-center gap-4">
              <Donut
                segments={allocation}
                size={132}
                center={
                  <>
                    <div className="uk-nums text-lg font-semibold">$111.9K</div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      invested
                    </div>
                  </>
                }
              />
              <Legend
                className="flex-1"
                items={allocation.map((a, i) => ({
                  label: a.label,
                  color: categoryColor(i),
                  percent: a.value / 111,
                }))}
              />
            </div>
          </GalleryTile>

          <GalleryTile label="Sparklines (sentiment)">
            <div className="space-y-3">
              <Sparkline
                values={[3, 5, 4, 7, 9, 12]}
                tone="positive"
                height={28}
              />
              <Sparkline
                values={[12, 10, 11, 8, 6, 4]}
                tone="negative"
                height={28}
              />
              <Sparkline
                values={[6, 7, 6, 7, 6, 7]}
                tone="neutral"
                height={28}
              />
            </div>
          </GalleryTile>

          <GalleryTile label="Cash-flow columns" className="sm:col-span-2">
            <ColumnChart
              values={sampleCols}
              height={120}
              signed
              highlightLast
            />
          </GalleryTile>

          <GalleryTile label="Bar list">
            <BarList
              items={[
                { label: 'Housing', value: 2650, displayValue: '$2,650' },
                { label: 'Food', value: 1180, displayValue: '$1,180' },
                { label: 'Transport', value: 620, displayValue: '$620' },
              ]}
            />
          </GalleryTile>

          <GalleryTile label="Progress + target">
            <div className="space-y-4 py-2">
              <div>
                <div className="text-muted-foreground mb-1.5 flex justify-between text-xs">
                  <span>Utilization</span>
                  <span className="uk-nums">31%</span>
                </div>
                <ProgressBar value={0.31} target={0.3} />
              </div>
              <StackedBar
                segments={[
                  { label: 'Essentials', value: 4291, color: 'var(--chart-1)' },
                  { label: 'Lifestyle', value: 318, color: 'var(--chart-4)' },
                ]}
              />
            </div>
          </GalleryTile>

          <GalleryTile label="Value atoms">
            <div className="space-y-3">
              <HeroValue value={207412} format="currency" size="card" />
              <div className="flex items-center gap-3">
                <DeltaBadge value={721} caption="net worth" pill />
                <DeltaBadge
                  value={318}
                  format="currency"
                  polarity="expense"
                  caption="spend"
                />
              </div>
              <div className="flex items-center gap-2">
                <MerchantChip name="Netflix" />
                <MerchantChip name="Whole Foods" />
                <MerchantChip name="Delta" />
                <span className="uk-nums text-muted-foreground text-sm">
                  {formatMoney(12480.55)} · {formatPercent(0.224)}
                </span>
              </div>
            </div>
          </GalleryTile>

          <GalleryTile label="Hero line + scrub" className="sm:col-span-3">
            <LineChart
              values={sampleLine}
              height={120}
              gradient={HERO_GRADIENT}
              showEndpoint
              onScrub={() => undefined}
            />
          </GalleryTile>
        </div>
      </div>
    </div>
  )
}

function kindSpan(kind: string): 1 | 2 {
  return /trend|ratio|breakdown|optimizer|comparison/.test(kind) ? 2 : 1
}
