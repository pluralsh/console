import { forwardRef, useContext, useMemo, useState } from 'react'
import { Button, Div, Flex, useDebounce } from 'honorable'
import {
  AppsIcon,
  Breadcrumb,
  Card,
  EmptyState,
  Input,
  ListBoxFooter,
  ListBoxItem,
  SearchIcon,
  Select,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListBoxFooterProps } from '@pluralsh/design-system/dist/components/ListBoxItem'
import styled, { useTheme } from 'styled-components'
import {
  DatabaseTableRowFragment,
  Maybe,
  PostgresDatabasesQuery,
  usePostgresDatabasesQuery,
} from 'generated/graphql'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { isEmpty } from 'lodash'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import { DB_MANAGEMENT_PATH } from 'components/db-management/constants'
import { SHORT_POLL_INTERVAL } from 'components/cluster/constants'

import chroma from 'chroma-js'

import demoDbs from './demo-dbs.json'

import {
  ColActions,
  ColAge,
  ColCpuReservation,
  ColInstances,
  ColMemoryReservation,
  ColName,
  ColStatus,
  ColVersion,
  ColVolume,
  DatabasesList,
} from './DatabasesList'

const DemoBlur = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  background: `linear-gradient(180deg, ${chroma(
    theme.colors['fill-zero']
  ).alpha(0.1)} 0%, ${theme.colors['fill-zero']} 100%)`,
  backdropFilter: `blur(1px)`,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

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

  return (
    <ResponsivePageFullWidth
      heading="Database management"
      scrollable={false}
    >
      {!availableFeatures?.databaseManagement ? (
        <RealDatabaseManagement />
      ) : (
        <DemoDatabaseManagement />
      )}
    </ResponsivePageFullWidth>
  )
}

function DemoDatabaseManagement() {
  const namespace = useParams().namespace || null
  const navigate = useNavigate()

  if (namespace) {
    navigate(`/${DB_MANAGEMENT_PATH}`)
  }

  return (
    <DatabaseManagementContent
      applications={[]}
      postgresDatabases={demoDbs as any}
      // error={error}
      // refetch={refetch}
      isDemo
    />
  )
}

function RealDatabaseManagement() {
  const { data, refetch, error } = usePostgresDatabasesQuery({
    pollInterval: SHORT_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const { applications, postgresDatabases } = data || {}

  return (
    <DatabaseManagementContent
      applications={applications}
      postgresDatabases={postgresDatabases}
      error={error}
      refetch={refetch}
    />
  )
}

function DatabaseManagementContent({
  applications,
  postgresDatabases,
  error,
  refetch,
  isDemo = false,
}: {
  applications: PostgresDatabasesQuery['applications']
  postgresDatabases: PostgresDatabasesQuery['postgresDatabases']
  error?: ReturnType<typeof usePostgresDatabasesQuery>['error']
  refetch?: ReturnType<typeof usePostgresDatabasesQuery>['refetch']
  isDemo?: boolean
}) {
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
    if (!postgresDatabases) {
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
  }, [postgresDatabases, applications])

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
      dbs = dbs?.filter((db) => db?.metadata?.namespace === namespace)
    }

    return dbs || []
  }, [namespace, postgresDatabases])

  const reactTableOptions = useMemo(
    () => ({
      state: { globalFilter: debouncedFilterString },
    }),
    [debouncedFilterString]
  )

  if (error) {
    return <>Sorry, something went wrong</>
  }

  if (!postgresDatabases || !applications) {
    return <LoadingIndicator />
  }

  return (
    <Flex
      direction="column"
      height="100%"
    >
      {isDemo && (
        <DemoBlur>
          <UpgradeDialog />
        </DemoBlur>
      )}
      <Flex
        direction="row"
        gap="medium"
      >
        <NamespaceSelect
          namespaces={filteredNamespaces}
          namespace={namespace}
          isDisabled={isDemo}
        />
        <Input
          startIcon={<SearchIcon />}
          placeholder="Filter by name"
          value={filterString}
          onChange={(e) => setFilterString(e.currentTarget.value)}
          marginBottom={theme.spacing.medium}
          flexGrow={1}
          disabled={isDemo}
        />
      </Flex>

      {!filteredDbs || filteredDbs.length === 0 ? (
        <EmptyState message="No databases match your selection" />
      ) : (
        <FullHeightTableWrap position="relative">
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
  )
}

const UpgradeDialogSC = styled(Card).attrs(() => ({ fillLevel: 2 }))(
  ({ theme }) => ({
    maxWidth: 720,
    marginTop: -70,
    padding: theme.spacing.xxlarge,
    color: theme.colors['text-light'],
    display: 'flex',
    flexDirection: 'column',
    rowGap: theme.spacing.large,
    ...theme.partials.text.body2,
    '.title': {
      ...theme.partials.text.body1Bold,
      color: theme.colors.text,
      margin: 0,
      marginBottom: theme.spacing.small,
    },
    p: {
      margin: 0,
    },
    '.buttonArea': {
      display: 'flex',
    },
  })
)

function UpgradeDialog() {
  return (
    <UpgradeDialogSC>
      <div>
        <h3 className="title">
          Upgrade your plan to access database management.
        </h3>
        <p>
          Restore your databases from a point in time with Plural database
          management.
        </p>
      </div>
      <div className="buttonArea">
        <Button
          primary
          as={Link}
          to="https://app.plural.sh/account/billing"
          target="_blank"
        >
          Review plans
        </Button>
      </div>
    </UpgradeDialogSC>
  )
}

const NamespaceIcon = styled.img(({ theme }) => ({
  width: theme.spacing.medium,
}))

function NamespaceSelect({
  namespaces,
  namespace,
  isDisabled = false,
}: {
  namespaces: { name: string; icon: string | null | undefined }[]
  namespace: string | null
  isDisabled: boolean
}) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  return isEmpty(namespaces) ? null : (
    <Div width={340}>
      <Select
        isDisabled={isDisabled}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        label={namespace || 'All apps'}
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
            leftContent={
              namespace.icon ? (
                <NamespaceIcon src={namespace.icon} />
              ) : undefined
            }
          />
        )) || []}
      </Select>
    </Div>
  )
}
