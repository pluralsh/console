import {
  Button,
  Card,
  CloseIcon,
  EmptyState,
  FiltersIcon,
  Flex,
  Input,
  MagnifyingGlassIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { CatalogFragment } from '../../generated/graphql.ts'
import { useTheme } from 'styled-components'
import { CATALOGS_ABS_PATH } from '../../routes/catalogRoutesConsts.tsx'
import Fuse from 'fuse.js'
import { useCallback, useMemo, useState } from 'react'
import { chain, isEmpty } from 'lodash'
import { CatalogsFilters } from './CatalogsFilters.tsx'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage.tsx'
import { CatalogsGrid } from './CatalogsGrid.tsx'

export const breadcrumbs = [
  { label: 'service catalog', url: CATALOGS_ABS_PATH },
]

// TODO: Replace with server-side search once it will be available.
const searchOptions = {
  keys: ['name', 'description'],
  threshold: 0.25,
}

// TODO: Use real data.
export const catalogs = Array(10)
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
  const [query, setQuery] = useState('')
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [authorFilters, setAuthorFilters] = useState<string[]>([])
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])

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

  const resetFilters = useCallback(() => {
    setAuthorFilters([])
    setCategoryFilters([])
  }, [setAuthorFilters, setCategoryFilters])

  const hasActiveSearch = !!query
  const hasActiveFilters = !isEmpty(authorFilters) || !isEmpty(categoryFilters)

  const resultCatalogs = useMemo(() => {
    const filteredCatalogs = catalogs.filter(({ author, category }) => {
      if (!isEmpty(authorFilters) && !authorFilters.includes(author)) {
        return false
      }

      if (!isEmpty(categoryFilters) && !categoryFilters.includes(category)) {
        return false
      }

      return true
    })

    const fuse = new Fuse(filteredCatalogs, searchOptions)
    return hasActiveSearch
      ? fuse.search(query).map(({ item }) => item)
      : filteredCatalogs
  }, [authorFilters, categoryFilters, hasActiveSearch, query])

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ResponsiveLayoutPage css={{ flexDirection: 'column' }}>
      <div
        css={{
          alignSelf: 'center',
          maxWidth: theme.breakpoints.desktop,
          overflow: 'hidden',
          width: '100%',

          [`@media (min-width: 1833px)`]: {
            maxWidth: theme.breakpoints.desktop + theme.spacing.large + 220, // Increased by filter panel and spacing size.
          },
        }}
      >
        <Flex height="100%">
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
                paddingRight: theme.spacing.xxsmall, // Additional space between scrollbar and cards.
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
                  onClick={() =>
                    hasActiveFilters
                      ? resetFilters()
                      : setFiltersVisible(!filtersVisible)
                  }
                  secondary
                  startIcon={hasActiveFilters ? <CloseIcon /> : <FiltersIcon />}
                  backgroundColor={
                    hasActiveFilters ? 'fill-zero-selected' : undefined
                  }
                >
                  {hasActiveFilters ? 'Reset filters' : 'Filters'}
                </Button>
              </div>
            </div>
            <Flex
              gap="medium"
              overflow={'hidden'}
            >
              <CatalogsGrid
                catalogs={resultCatalogs}
                emptyState={
                  <Card
                    css={{ height: '100%', padding: theme.spacing.xxlarge }}
                  >
                    <EmptyState message="There are no results with these filters.">
                      <Button
                        secondary
                        onClick={() => {
                          resetFilters()
                          setQuery('')
                        }}
                      >
                        Reset filers
                      </Button>
                    </EmptyState>
                  </Card>
                }
              />
            </Flex>
          </Flex>
          {filtersVisible && (
            <CatalogsFilters
              authors={authors}
              authorFilters={authorFilters}
              setAuthorFilters={setAuthorFilters}
              categories={categories}
              categoryFilters={categoryFilters}
              setCategoryFilters={setCategoryFilters}
            />
          )}
        </Flex>
      </div>
    </ResponsiveLayoutPage>
  )
}
