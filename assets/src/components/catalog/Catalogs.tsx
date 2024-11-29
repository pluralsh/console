import {
  Button,
  CatalogCard,
  FiltersIcon,
  Input,
  MagnifyingGlassIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth.tsx'
import { CatalogFragment } from '../../generated/graphql.ts'
import { useTheme } from 'styled-components'
import {
  CATALOGS_ABS_PATH,
  getCatalogAbsPath,
} from '../../routes/catalogRoutesConsts.tsx'
import { useNavigate } from 'react-router-dom'

export const breadcrumbs = [
  { label: 'service catalog', url: CATALOGS_ABS_PATH },
]

const catalogs = Array(5)
  .fill([
    {
      id: '0',
      name: 'Base catalog',
      author: 'Plural',
      description:
        'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
      category: 'Messaging',
    },
    {
      id: '1',
      name: 'Base catalog',
      author: 'Plural',
      description:
        'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
      category: 'Data',
    },
  ] satisfies CatalogFragment[])
  .flat()

export function Catalogs() {
  const theme = useTheme()
  const navigate = useNavigate()

  // const { data } = useFetchPaginatedData({
  //   queryHook: useCatalogsQuery,
  //   keyPath: ['catalogs'],
  // })
  //
  // const catalogs = useMemo(
  //   () => mapExistingNodes(data?.catalogs),
  //   [data?.catalogs]
  // )

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ResponsivePageFullWidth
      noPadding
      maxContentWidth={1280}
    >
      <div
        css={{
          alignItems: 'center',
          display: 'flex',
          gap: theme.spacing.large,
          justifyContent: 'space-between',
          marginBottom: theme.spacing.medium,
        }}
      >
        <div css={{ ...theme.partials.text.subtitle1 }}>Service catalogs</div>
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.medium,
          }}
        >
          <Input
            placeholder="Search PR bundles"
            startIcon={<MagnifyingGlassIcon color="icon-light" />}
            width={320}
          />
          <Button
            secondary
            startIcon={<FiltersIcon />}
          >
            Filters
          </Button>
        </div>
      </div>
      <div
        css={{
          display: 'grid',
          gap: theme.spacing.medium,
          gridTemplateColumns: 'repeat(auto-fit, minmax(256px, 1fr))',
        }}
      >
        {catalogs?.map(({ id, name, author, description, category }) => (
          <CatalogCard
            name={name}
            author={author}
            description={description}
            category={category}
            onClick={() => navigate(getCatalogAbsPath(id))}
          />
        ))}
      </div>
    </ResponsivePageFullWidth>
  )
}
