import {
  Button,
  Card,
  CloseIcon,
  EmptyState,
  FiltersIcon,
  Flex,
  Input,
  MagnifyingGlassIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import Fuse from 'fuse.js'
import { useCatalogsQuery } from 'generated/graphql'
import { chain, isEmpty } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { CatalogsFilters } from './CatalogsFilters'
import { CatalogsGrid } from './CatalogsGrid'

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

  if (error) return <GqlError error={error} />
  if (!catalogs && loading) return <LoadingIndicator />

  return (
    <WrapperSC>
      <Flex
        direction="column"
        grow={1}
        height="100%"
        overflow="hidden"
        gap="medium"
      >
        <Flex
          gap="medium"
          width="100%"
          justify="space-between"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            showClearButton
            placeholder="Search catalog"
            startIcon={<MagnifyingGlassIcon color="icon-light" />}
            width="100%"
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
        </Flex>
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
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  gap: theme.spacing.large,
}))
