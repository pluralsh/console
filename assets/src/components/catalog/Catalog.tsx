import { CatalogCard, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth.tsx'
import { CatalogFragment } from '../../generated/graphql.ts'
import { useTheme } from 'styled-components'

export const breadcrumbs = [{ label: 'service catalog' }]

const catalogs = Array(5)
  .fill([
    {
      id: '0',
      name: 'Service catalog',
      author: 'Plural',
      description:
        'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
      category: 'Messaging',
    },
    {
      id: '1',
      name: 'Service catalog',
      author: 'Plural',
      description:
        'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
      category: 'Data',
    },
  ] satisfies CatalogFragment[])
  .flat()

export function Catalog() {
  const theme = useTheme()

  useSetBreadcrumbs(breadcrumbs)

  // const { data } = useFetchPaginatedData({
  //   queryHook: useCatalogsQuery,
  //   keyPath: ['catalogs'],
  // })
  //
  // const catalogs = useMemo(
  //   () => mapExistingNodes(data?.catalogs),
  //   [data?.catalogs]
  // )

  return (
    <ResponsivePageFullWidth
      noPadding
      maxContentWidth={1280}
    >
      <div
        css={{
          display: 'grid',
          gap: theme.spacing.medium,
          gridTemplateColumns: 'repeat(auto-fit, minmax(256px, 1fr))',
        }}
      >
        {catalogs?.map(({ name, author, description, category }) => (
          <CatalogCard
            name={name}
            author={author}
            description={description}
            category={category}
          />
        ))}
      </div>
    </ResponsivePageFullWidth>
  )
}
