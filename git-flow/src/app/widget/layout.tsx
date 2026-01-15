import { WidgetLayout } from '@moldable-ai/ui'

export default function WidgetLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <WidgetLayout>{children}</WidgetLayout>
}
