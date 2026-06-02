import {
  Button,
  Card,
  CloseIcon,
  EmptyState,
  FiltersIcon,
  Flex,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useCatalogsQuery } from 'generated/graphql'
import Fuse from 'fuse.js'
import { chain, countBy, isEmpty } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { CatalogsFilters } from './CatalogsFilters'
import { CatalogsGrid } from './CatalogsGrid'
import { SelfServiceSearchBar } from './SelfServiceSearchBar'

type CatalogFilterKey = 'author' | 'category'

const catalogFuseSearchOptions = {
  keys: ['name', 'description', 'category'],
  threshold: 0.25,
}

function getCatalogFilters(
  catalogs: ReturnType<typeof mapExistingNodes>,
  filterKey: CatalogFilterKey
) {
  return chain(catalogs)
    .map(filterKey)
    .compact()
    .thru(countBy)
    .map((items, key) => ({ key, items }))
    .value()
}

function matchesCatalogFilters({
  author,
  authorFilters,
  category,
  categoryFilters,
}: {
  author?: Nullable<string>
  authorFilters: string[]
  category?: Nullable<string>
  categoryFilters: string[]
}) {
  if (!isEmpty(authorFilters) && (!author || !authorFilters.includes(author))) {
    return false
  }

  if (
    !isEmpty(categoryFilters) &&
    (!category || !categoryFilters.includes(category))
  ) {
    return false
  }

  return true
}

export function Catalogs() {
  const theme = useTheme()
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [authorFilters, setAuthorFilters] = useState<string[]>([])
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useCatalogsQuery,
      keyPath: ['catalogs'],
    })

  const catalogs = useMemo(
    () => mapExistingNodes(data?.catalogs),
    [data?.catalogs]
  )

  const resetFilters = useCallback(() => {
    setAuthorFilters([])
    setCategoryFilters([])
  }, [])

  const hasActiveFilters = !isEmpty(authorFilters) || !isEmpty(categoryFilters)
  const trimmedSearchQuery = searchQuery.trim()
  const hasActiveSearch = !!trimmedSearchQuery
  const filterCatalogs = useMemo(() => {
    if (!hasActiveSearch) return catalogs

    return new Fuse(catalogs, catalogFuseSearchOptions)
      .search(trimmedSearchQuery)
      .map(({ item }) => item)
  }, [catalogs, hasActiveSearch, trimmedSearchQuery])
  const authors = useMemo(
    () => getCatalogFilters(filterCatalogs, 'author'),
    [filterCatalogs]
  )
  const categories = useMemo(
    () => getCatalogFilters(filterCatalogs, 'category'),
    [filterCatalogs]
  )
  const displayCatalogs = useMemo(
    () =>
      filterCatalogs.filter(({ author, category }) =>
        matchesCatalogFilters({
          author,
          authorFilters,
          category,
          categoryFilters,
        })
      ),
    [authorFilters, categoryFilters, filterCatalogs]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      css={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        gap: theme.spacing.large,
      }}
    >
      <Flex
        direction="column"
        grow={1}
        height="100%"
        overflow="hidden"
        gap="medium"
      >
        <SelfServiceSearchBar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          aside={
            <Button
              onClick={() =>
                hasActiveFilters
                  ? resetFilters()
                  : setFiltersVisible(!filtersVisible)
              }
              secondary
              startIcon={hasActiveFilters ? <CloseIcon /> : <FiltersIcon />}
              style={{
                borderColor: hasActiveFilters
                  ? theme.colors['border-primary']
                  : undefined,
              }}
            >
              {hasActiveFilters ? 'Reset filters' : 'Filters'}
            </Button>
          }
        />
        <CatalogsGrid
          catalogs={displayCatalogs}
          onBottomReached={() => {
            if (!hasActiveSearch && !loading && pageInfo?.hasNextPage) {
              fetchNextPage()
            }
          }}
          loading={!hasActiveSearch && loading}
          emptyState={
            <Card
              css={{
                flexGrow: 1,
                padding: theme.spacing.xxlarge,
                ...(theme.mode === 'light' && {
                  backgroundColor: theme.colors['fill-zero'],
                }),
              }}
            >
              <EmptyState
                message={
                  hasActiveFilters || hasActiveSearch
                    ? 'There are no results with these filters.'
                    : 'There are no catalogs available.'
                }
              >
                {(hasActiveFilters || hasActiveSearch) && (
                  <Button
                    secondary
                    onClick={() => {
                      resetFilters()
                      setSearchQuery('')
                    }}
                  >
                    Reset filters
                  </Button>
                )}
              </EmptyState>
            </Card>
          }
        />
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
  )
}
