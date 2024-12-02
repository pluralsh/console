import {
  Button,
  Card,
  CatalogCard,
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
import {
  CATALOGS_ABS_PATH,
  getCatalogAbsPath,
} from '../../routes/catalogRoutesConsts.tsx'
import { useNavigate } from 'react-router-dom'
import { catalogImageUrl } from './common.ts'
import Fuse from 'fuse.js'
import { useCallback, useMemo, useState } from 'react'
import { chain, isEmpty } from 'lodash'
import { CatalogsFilters } from './CatalogsFilters.tsx'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage.tsx'

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
                      : setFitlersVisible(!filtersVisible)
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
              {!isEmpty(resultCatalogs) ? (
                <div
                  css={{
                    display: 'grid',
                    gap: theme.spacing.medium,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(256px, 1fr))',
                    flexGrow: 1,
                    overflow: 'auto',
                    paddingBottom: theme.spacing.large,
                    paddingRight: theme.spacing.xxsmall, // Additional space between scrollbar and cards.
                  }}
                >
                  {resultCatalogs?.map(
                    ({
                      id,
                      name,
                      author,
                      description,
                      category,
                      icon,
                      darkIcon,
                    }) => (
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
              ) : (
                <Card css={{ height: '100%', padding: theme.spacing.xxlarge }}>
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
              )}
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
