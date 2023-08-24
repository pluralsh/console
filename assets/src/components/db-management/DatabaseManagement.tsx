import { forwardRef, useContext, useMemo, useState } from 'react'
import { Div, Flex, useDebounce } from 'honorable'
import {
  AppsIcon,
  Breadcrumb,
  ComboBox,
  EmptyState,
  Input,
  ListBoxFooter,
  ListBoxItem,
  SearchIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import Fuse from 'fuse.js'
import { useNavigate, useParams } from 'react-router-dom'
import { ListBoxFooterProps } from '@pluralsh/design-system/dist/components/ListBoxItem'
import styled, { useTheme } from 'styled-components'
import {
  DatabaseTableRowFragment,
  Maybe,
  NamespaceMetaFragment,
  usePostgresDatabasesQuery,
} from 'generated/graphql'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { isEmpty } from 'lodash'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import { DB_MANAGEMENT_PATH } from 'components/db-management/constants'
import { SHORT_POLL_INTERVAL } from 'components/cluster/constants'

import {
  ColActions,
  ColAge,
  ColCpuReservation,
  ColInstances,
  ColMemoryReservation,
  ColName,
  // ColNamespace,
  ColStatus,
  ColVersion,
  DatabasesList,
} from './DatabasesList'

const ListBoxFooterPlusInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))
const NamespaceListFooter = forwardRef<
  HTMLDivElement,
  Omit<ListBoxFooterProps, 'children'>
>(({ leftContent, ...props }, ref) => {
  const theme = useTheme()
  const label = 'View all'

  return (
    <ListBoxFooterPlusInner
      ref={ref}
      leftContent={
        leftContent || (
          <AppsIcon
            size={16}
            color={theme.colors['text-primary-accent'] as string}
          >
            {label}
          </AppsIcon>
        )
      }
      {...props}
    >
      {label}
    </ListBoxFooterPlusInner>
  )
})

const searchOptions = {
  keys: ['metadata.name'],
  threshold: 0.25,
}

const breadcrumbs: Breadcrumb[] = [
  { label: 'plural-cluster' },
  { label: 'database-management', url: `/${DB_MANAGEMENT_PATH}` },
]

export type DatabaseWithId = DatabaseTableRowFragment & {
  id?: string | null | undefined
}

export default function DatabaseManagement() {
  const { availableFeatures } = useContext(SubscriptionContext)

  useSetBreadcrumbs(breadcrumbs)

  const { data, refetch, error, loading } = usePostgresDatabasesQuery({
    pollInterval: SHORT_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const { applications, namespaces, postgresDatabases } = data || {}

  console.log('apps', applications)
  console.log('dbs', postgresDatabases?.[0])
  console.log('error', error)
  console.log('loading', loading)

  const columns = useMemo(
    () => [
      // ColNamespace,
      ColName,
      ColInstances,
      ColVersion,
      ColCpuReservation,
      ColMemoryReservation,
      ColAge,
      ColStatus,
      ColActions(refetch),
    ],
    [refetch]
  )
  const theme = useTheme()
  const namespace = useParams().namespace || null
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState<string>(namespace || '')
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 300)

  // Filter out namespaces that don't exist in the dbs list
  let filteredNamespaces = useMemo(() => {
    if (!postgresDatabases || !namespaces) {
      return []
    }
    const namespaceSet = new Set<string>()

    for (const db of postgresDatabases || []) {
      if (db?.metadata?.namespace) {
        namespaceSet.add(db.metadata.namespace)
      }
    }

    return (
      namespaces?.filter(
        (ns: Maybe<NamespaceMetaFragment>): ns is NamespaceMetaFragment =>
          !!ns?.metadata?.name && namespaceSet.has(ns.metadata.name)
      ) || []
    )
  }, [postgresDatabases, namespaces])

  // Filter out names that don't match search criteria
  filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(filteredNamespaces, searchOptions)

    return inputValue
      ? fuse.search(inputValue).map(({ item }) => item)
      : filteredNamespaces
  }, [filteredNamespaces, inputValue])

  const filteredDbs = useMemo(() => {
    if (!postgresDatabases) {
      return undefined
    }
    let dbs = postgresDatabases
      .filter(
        (db: Maybe<DatabaseTableRowFragment>): db is DatabaseTableRowFragment =>
          !!db
      )
      .map(
        (db): DatabaseWithId => ({
          id: `${db.metadata.name}-${db?.metadata?.namespace}`,
          ...db,
        })
      )

    if (namespace) {
      dbs = dbs?.filter((pod) => pod?.metadata?.namespace === namespace)
    }

    return dbs || []
  }, [namespace, postgresDatabases])

  const reactTableOptions = useMemo(
    () => ({
      state: { globalFilter: debouncedFilterString },
    }),
    [debouncedFilterString]
  )

  console.log('availalbe features', availableFeatures)
  if (!availableFeatures?.databaseManagement) {
    // Temporary -Klink
    console.log('not available')

    return <div>Not available</div>
  }

  if (error) {
    return <>Sorry, something went wrong</>
  }

  return (
    <ResponsivePageFullWidth
      heading="Databases"
      scrollable={false}
      headingContent={
        isEmpty(filteredNamespaces) ? null : (
          <Div width={320}>
            <ComboBox
              inputProps={{ placeholder: 'Filter by namespace' }}
              inputValue={inputValue}
              onInputChange={setInputValue}
              selectedKey={namespace}
              onSelectionChange={(ns) => {
                if (ns) {
                  setInputValue(`${ns}`)
                  navigate(`/${DB_MANAGEMENT_PATH}/${ns}`)
                }
              }}
              // Close combobox panel once footer is clicked.
              // It does not work with isOpen and onOpenChange at the moment.
              dropdownFooterFixed={
                <NamespaceListFooter
                  onClick={() => {
                    setInputValue('')
                    navigate('/pods')
                  }}
                />
              }
              aria-label="namespace"
              width={320}
            >
              {filteredNamespaces?.map((namespace, i) => (
                <ListBoxItem
                  key={`${namespace?.metadata?.name || i}`}
                  textValue={`${namespace?.metadata?.name}`}
                  label={`${namespace?.metadata?.name}`}
                >
                  Hello {namespace.metadata.name}
                </ListBoxItem>
              )) || []}
            </ComboBox>
          </Div>
        )
      }
    >
      {!data ? (
        <LoadingIndicator />
      ) : (
        <Flex
          direction="column"
          height="100%"
        >
          <Input
            startIcon={<SearchIcon />}
            placeholder="Filter pods"
            value={filterString}
            onChange={(e) => setFilterString(e.currentTarget.value)}
            marginBottom={theme.spacing.medium}
          />
          {!filteredDbs || filteredDbs.length === 0 ? (
            <EmptyState message="No pods match your selection" />
          ) : (
            <FullHeightTableWrap>
              <DatabasesList
                databases={filteredDbs}
                // applications={data?.applications}
                columns={columns}
                reactTableOptions={reactTableOptions}
                maxHeight="unset"
                height="100%"
              />
            </FullHeightTableWrap>
          )}
        </Flex>
      )}
    </ResponsivePageFullWidth>
  )
}
