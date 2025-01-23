import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { useTheme } from 'styled-components'
import { PluralErrorBoundary } from '../cd/PluralErrorBoundary'

export default function Edge() {
  const theme = useTheme()

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      headingContent="Edge cluster registrations"
    >
      <PluralErrorBoundary>...</PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
