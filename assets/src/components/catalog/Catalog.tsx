import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth.tsx'
import { CatalogFragment } from '../../generated/graphql.ts'
import { useTheme } from 'styled-components'
import { useMemo } from 'react'
import { breadcrumbs } from './Catalogs.tsx'

const catalog = {
  id: '0',
  name: 'Base catalog',
  author: 'Plural',
  description:
    'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
  category: 'Messaging',
} satisfies CatalogFragment

export function Catalog() {
  const theme = useTheme()
  const id = '0'

  // const { data } = useFetchPaginatedData({
  //   queryHook: useCatalogsQuery,
  //   keyPath: ['catalogs'],
  // })
  //
  // const catalogs = useMemo(
  //   () => mapExistingNodes(data?.catalogs),
  //   [data?.catalogs]
  // )

  useSetBreadcrumbs(
    useMemo(() => [...breadcrumbs, { label: catalog.name ?? id }], [id])
  )

  return (
    <ResponsivePageFullWidth
      noPadding
      maxContentWidth={1280}
    >
      ...
    </ResponsivePageFullWidth>
  )
}
