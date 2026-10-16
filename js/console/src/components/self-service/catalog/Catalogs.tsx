import { Button, Card, EmptyState, Flex } from '@pluralsh/design-system'
import { PageSidecarPortal } from 'components/layout/PageLayout'
import { DisplayButton } from 'components/utils/display/DisplayPanel'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { GqlError } from 'components/utils/Alert'
import { Body2P, Subtitle1H1 } from 'components/utils/typography/Text'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  CatalogsDocument,
  CatalogsQuery,
  CatalogsQueryVariables,
} from 'generated/graphql'
import Fuse from 'fuse.js'
import { chain, countBy, isEmpty } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { CatalogsFilters } from './CatalogsFilters'
import { CatalogsGrid } from './CatalogsGrid'
import { SelfServiceSearchBar } from './SelfServiceSearchBar'
import { useSelfServiceCatalogSearch } from './useSelfServiceCatalogSearch'

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
  authorFilters: af,
  category,
  categoryFilters: cf,
}: {
  author?: Nullable<string>
  authorFilters: string[]
  category?: Nullable<string>
  categoryFilters: string[]
}) {
  return (
    (isEmpty(af) || (!!author && af.includes(author))) &&
    (isEmpty(cf) || (!!category && cf.includes(category)))
  )
}

export function Catalogs() {
  const theme = useTheme()
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [authorFilters, setAuthorFilters] = useState<string[]>([])
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const search = useSelfServiceCatalogSearch()

  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData<CatalogsQuery, CatalogsQueryVariables>({
      query: CatalogsDocument,
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

  const {
    hasActiveSearch,
    useFallbackSearch,
    isSearchPending,
    debouncedSearchQuery,
    semanticSearchEnabled,
  } = search

  const filterCatalogs = useMemo(() => {
    if (useFallbackSearch)
      return new Fuse(catalogs, catalogFuseSearchOptions)
        .search(debouncedSearchQuery)
        .map(({ item }) => item)
    return catalogs
  }, [catalogs, debouncedSearchQuery, useFallbackSearch])

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
    <>
      <PageToolbarPortal>
        {semanticSearchEnabled && <SelfServiceSearchBar search={search} />}
        <DisplayButton
          showDot={hasActiveFilters}
          expanded={filtersVisible}
          onClick={() => setFiltersVisible(!filtersVisible)}
        />
      </PageToolbarPortal>
      {filtersVisible && (
        <PageSidecarPortal>
          <CatalogsFilters
            authors={authors}
            authorFilters={authorFilters}
            setAuthorFilters={setAuthorFilters}
            categories={categories}
            categoryFilters={categoryFilters}
            setCategoryFilters={setCategoryFilters}
          />
        </PageSidecarPortal>
      )}
      <Flex direction="column">
        <Subtitle1H1>Service catalog</Subtitle1H1>
        <Body2P $color="text-light">
          Browse catalogs of PR automations to provision infrastructure and
          services on demand.
        </Body2P>
      </Flex>
      <CatalogsGrid
        catalogs={displayCatalogs}
        onBottomReached={() => {
          if (!isSearchPending && !loading && pageInfo?.hasNextPage) {
            fetchNextPage()
          }
        }}
        loading={loading}
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
                    search.setSearchQuery('')
                  }}
                >
                  Reset filters
                </Button>
              )}
            </EmptyState>
          </Card>
        }
      />
    </>
  )
}
