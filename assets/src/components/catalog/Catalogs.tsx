import {
  Button,
  Card,
  CatalogCard,
  FiltersIcon,
  Flex,
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
import { catalogImageUrl } from './common.ts'
import Fuse from 'fuse.js'
import { useMemo, useState } from 'react'
import { chain } from 'lodash'

export const breadcrumbs = [
  { label: 'service catalog', url: CATALOGS_ABS_PATH },
]

// TODO: Replace with server-side search once it will be available.
const searchOptions = {
  keys: ['name', 'description'],
  threshold: 0.25,
}

// TODO: Use real data.
const catalogs = Array(10)
  .fill([
    {
      id: '0',
      icon: `/cluster-distros/eks-dark.svg`,
      name: 'Base catalog',
      author: 'Plural',
      description:
        'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
      category: 'Messaging',
    },
    {
      id: '1',
      name: 'Base catalog',
      author: 'Google',
      description:
        'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
      category: 'Data',
    },
    {
      id: '2',
      name: 'Base catalog',
      author: 'Microsoft',
      description:
        'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
      category: 'Data',
    },
  ] satisfies CatalogFragment[])
  .flat()

export function Catalogs() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filtersVisible, setFitlersVisible] = useState(true) // todo

  // const { data } = useFetchPaginatedData({
  //   queryHook: useCatalogsQuery,
  //   keyPath: ['catalogs'],
  // })
  //
  // const catalogs = useMemo(
  //   () => mapExistingNodes(data?.catalogs),
  //   [data?.catalogs]
  // )

  const authors = useMemo(
    () =>
      chain(catalogs)
        .groupBy('author')
        .map((value, key) => ({ key, items: value.length }))
        .value(),
    []
  )

  const categories = useMemo(
    () =>
      chain(catalogs)
        .groupBy('category')
        .map((value, key) => ({ key, items: value.length }))
        .value(),
    []
  )

  const filteredCatalogs = useMemo(() => {
    const fuse = new Fuse(catalogs, searchOptions)
    return query ? fuse.search(query).map(({ item }) => item) : catalogs
  }, [query])

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ResponsivePageFullWidth
      maxContentWidth={1280}
      scrollable={false}
      noPadding
    >
      <Flex
        gap="medium"
        height="100%"
        paddingBottom={theme.spacing.large}
      >
        <Flex
          direction="column"
          grow={1}
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
            <div css={{ ...theme.partials.text.subtitle1 }}>
              Service catalogs
            </div>
            <div
              css={{
                display: 'flex',
                gap: theme.spacing.medium,
              }}
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                showClearButton
                placeholder="Search PR bundles"
                startIcon={<MagnifyingGlassIcon color="icon-light" />}
                width={320}
              />
              <Button
                onClick={() => setFitlersVisible(!filtersVisible)}
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
              overflow: 'auto',
            }}
          >
            {filteredCatalogs?.map(
              ({ id, name, author, description, category, icon, darkIcon }) => (
                <CatalogCard
                  imageUrl={catalogImageUrl(icon, darkIcon, theme.mode)}
                  name={name}
                  author={author}
                  description={description}
                  category={category}
                  onClick={() => navigate(getCatalogAbsPath(id))}
                />
              )
            )}
          </div>
        </Flex>
        {filtersVisible && (
          <Card width={220}>
            Authors
            {authors.map(({ key, items }) => (
              <div>
                {key} ({items})
              </div>
            ))}
            Categories
            {categories.map(({ key, items }) => (
              <div>
                {key} ({items})
              </div>
            ))}
          </Card>
        )}
      </Flex>
    </ResponsivePageFullWidth>
  )
}
