import { WidgetLayout } from '@moldable/ui'

export default function WidgetLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <WidgetLayout>{children}</WidgetLayout>
}
