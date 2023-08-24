import { ReactNode, forwardRef, useContext, useMemo, useState } from 'react'
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
  Select,
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
  ColVolume,
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

  const columns = useMemo(
    () => [
      // ColNamespace,
      ColName,
      ColVersion,
      ColInstances,
      ColVolume,
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
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 300)

  // Filter out namespaces that don't exist in the dbs list
  const filteredNamespaces = useMemo(() => {
    if (!postgresDatabases || !namespaces) {
      return []
    }
    const namespaceSet = new Set<string>()

    for (const db of postgresDatabases || []) {
      if (db?.metadata?.namespace) {
        namespaceSet.add(db.metadata.namespace)
      }
    }

    return Array.from(namespaceSet).map((name) => {
      const icons = applications?.find((app) => app?.name === name)?.spec
        .descriptor.icons

      return {
        name,
        icon: icons?.[1] || icons?.[0],
      }
    })
  }, [postgresDatabases, namespaces, applications])

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

  console.log('available features', availableFeatures)
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
      heading="Database management"
      scrollable={false}
    >
      {!data ? (
        <LoadingIndicator />
      ) : (
        <Flex
          direction="column"
          height="100%"
        >
          <Flex
            direction="row"
            gap="medium"
          >
            <NamespaceSelect
              namespaces={filteredNamespaces}
              namespace={namespace}
            />
            <Input
              startIcon={<SearchIcon />}
              placeholder="Filter by name"
              value={filterString}
              onChange={(e) => setFilterString(e.currentTarget.value)}
              marginBottom={theme.spacing.medium}
              flexGrow={1}
            />
          </Flex>

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

const NamespaceIcon = styled.img(({ theme }) => ({
  width: theme.spacing.medium,
}))

const NamespaceSelectItem = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
}))

function NamespaceSelect({
  namespaces,
  namespace,
}: {
  namespaces: { name: string; icon: string | null | undefined }[]
  namespace: string | null
}) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  return isEmpty(namespaces) ? null : (
    <Div width={340}>
      <Select
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        label="All apps"
        selectedKey={namespace}
        onSelectionChange={(ns) => {
          if (ns) {
            navigate(`/${DB_MANAGEMENT_PATH}/${ns}`)
          }
        }}
        dropdownFooterFixed={
          <NamespaceListFooter
            onClick={() => {
              setIsOpen(false)
              navigate(`/${DB_MANAGEMENT_PATH}`)
            }}
          />
        }
        titleContent={
          <>
            <AppsIcon marginRight="small" /> Apps
          </>
        }
        aria-label="namespace"
      >
        {namespaces?.map((namespace, i) => (
          <ListBoxItem
            key={`${namespace?.name || i}`}
            textValue={`${namespace?.name}`}
            label={namespace?.name}
            leftContent={<NamespaceIcon src={namespace.icon} />}
          />
        )) || []}
      </Select>
    </Div>
  )
}
