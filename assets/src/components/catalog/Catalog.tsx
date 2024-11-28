import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth.tsx'

export const breadcrumbs = [{ label: 'service catalog' }]

export function Catalog() {
  useSetBreadcrumbs(breadcrumbs)

  return (
    <ResponsivePageFullWidth
      noPadding
      maxContentWidth={1280}
    >
      ...
    </ResponsivePageFullWidth>
  )
}
