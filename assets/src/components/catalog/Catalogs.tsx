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
import { useCatalogsQuery } from '../../generated/graphql.ts'
import { useTheme } from 'styled-components'
import { CATALOGS_ABS_PATH } from '../../routes/catalogRoutesConsts.tsx'
import Fuse from 'fuse.js'
import { useCallback, useMemo, useState } from 'react'
import { chain, isEmpty } from 'lodash'
import { CatalogsFilters } from './CatalogsFilters.tsx'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage.tsx'
import { CatalogsGrid } from './CatalogsGrid.tsx'
import { GqlError } from '../utils/Alert.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import { mapExistingNodes } from '../../utils/graphql.ts'

export const breadcrumbs = [
  { label: 'service catalog', url: CATALOGS_ABS_PATH },
]

// TODO: Replace with server-side search once it will be available.
const searchOptions = {
  keys: ['name', 'description'],
  threshold: 0.25,
}

export function Catalogs() {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [authorFilters, setAuthorFilters] = useState<string[]>([])
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])

  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useCatalogsQuery,
      keyPath: ['catalogs'],
    })

  const catalogs = useMemo(
    () => mapExistingNodes(data?.catalogs),
    [data?.catalogs]
  )

  const authors = useMemo(
    () =>
      chain(catalogs)
        .filter(({ author }) => !!author)
        .groupBy('author')
        .map((value, key) => ({ key, items: value.length }))
        .value(),
    [catalogs]
  )

  const categories = useMemo(
    () =>
      chain(catalogs)
        .filter(({ category }) => !!category)
        .groupBy('category')
        .map((value, key) => ({ key, items: value.length }))
        .value(),
    [catalogs]
  )

  const resetFilters = useCallback(() => {
    setAuthorFilters([])
    setCategoryFilters([])
  }, [setAuthorFilters, setCategoryFilters])

  const hasActiveSearch = !!query
  const hasActiveFilters = !isEmpty(authorFilters) || !isEmpty(categoryFilters)

  const resultCatalogs = useMemo(() => {
    const filteredCatalogs = catalogs.filter(({ author, category }) => {
      if (
        !isEmpty(authorFilters) &&
        (!author || !authorFilters.includes(author))
      ) {
        return false
      }

      if (
        !isEmpty(categoryFilters) &&
        (!category || !categoryFilters.includes(category))
      ) {
        return false
      }

      return true
    })

    const fuse = new Fuse(filteredCatalogs, searchOptions)
    return hasActiveSearch
      ? fuse.search(query).map(({ item }) => item)
      : filteredCatalogs
  }, [authorFilters, catalogs, categoryFilters, hasActiveSearch, query])

  useSetBreadcrumbs(breadcrumbs)

  if (error) return <GqlError error={error} />

  if (!catalogs && loading) return <LoadingIndicator />

  return (
    <ResponsiveLayoutPage css={{ flexDirection: 'column' }}>
      <div
        css={{
          alignSelf: 'center',
          height: '100%',
          maxWidth: theme.breakpoints.desktop,
          overflow: 'hidden',
          width: '100%',

          [`@media (min-width: 1833px)`]: {
            maxWidth: theme.breakpoints.desktop + theme.spacing.large + 220, // Increased by filter panel and spacing size.
          },
        }}
      >
        <Flex
          height="100%"
          overflow={'hidden'}
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
                paddingRight: theme.spacing.xxsmall, // Additional space between scrollbar and cards.
              }}
            >
              <div css={{ ...theme.partials.text.subtitle1 }}>
                Service catalog
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
                  style={{
                    borderColor: hasActiveFilters
                      ? theme.colors['border-primary']
                      : undefined,
                  }}
                >
                  {hasActiveFilters ? 'Reset filters' : 'Filters'}
                </Button>
              </div>
            </div>
            <Flex
              gap="medium"
              overflow={'hidden'}
              paddingBottom={theme.spacing.large}
              {...(isEmpty(resultCatalogs) ? { height: '100%' } : {})}
            >
              <CatalogsGrid
                catalogs={resultCatalogs}
                onBottomReached={() => {
                  if (!loading && pageInfo?.hasNextPage) fetchNextPage()
                }}
                emptyState={
                  <Card
                    css={{
                      flexGrow: 1,
                      padding: theme.spacing.xxlarge,
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
                            setQuery('')
                          }}
                        >
                          Reset filers
                        </Button>
                      )}
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
