import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  Breadcrumb,
  GearTrainIcon,
  IconFrame,
  TabPanel,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  ComponentProps,
  Key,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Row } from '@tanstack/react-table'
import { VirtualItem } from '@tanstack/react-virtual'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import chroma from 'chroma-js'
import { useDebounce } from '@react-hooks-library/core'
import { isEmpty } from 'lodash'

import {
  ClustersRowFragment,
  Conjunction,
  useClustersQuery,
} from 'generated/graphql'

import {
  CD_REL_PATH,
  CLUSTERS_REL_PATH,
  GLOBAL_SETTINGS_ABS_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'

import { Edge, extendConnection } from 'utils/graphql'
import { keyToTag } from 'utils/clusterTags'
import usePersistedState from 'components/hooks/usePersistedState'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'
import { GqlError } from 'components/utils/Alert'

import {
  POLL_INTERVAL,
  useSetPageHeaderContent,
  useSetPageScrollable,
} from '../ContinuousDeployment'
import { useCDEnabled } from '../utils/useCDEnabled'
import { DEMO_CLUSTERS } from '../utils/demoData'

import {
  ClusterStatusTabKey,
  ClustersFilters,
} from '../services/ClustersFilters'

import CreateCluster from './create/CreateCluster'
import { DemoTable } from './ClustersDemoTable'
import { ClustersGettingStarted } from './ClustersGettingStarted'
import { columns } from './ClustersColumns'

export const CLUSTERS_QUERY_PAGE_SIZE = 100

export const CD_CLUSTERS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'cd', url: '/cd' },
  { label: 'clusters', url: `${CD_REL_PATH}/${CLUSTERS_REL_PATH}` },
]

type TableWrapperSCProps = {
  $blurred: boolean
}
export const TableWrapperSC = styled(FullHeightTableWrap)<TableWrapperSCProps>(
  ({ theme, $blurred }) => ({
    '&&': {
      ...($blurred
        ? {
            position: 'relative',
            height: 'fit-content',
            // maxHeight: 300,
            pointerEvents: 'none',
            '&:before': {
              content: '""',
              position: 'absolute',
              top: -5,
              left: -5,
              right: -5,
              bottom: -5,
              zIndex: 10,
              background: `linear-gradient(180deg, ${chroma(
                theme.colors['fill-zero']
              ).alpha(0.1)} 0%, ${theme.colors['fill-zero']} 100%)`,
              backdropFilter: `blur(1px)`,
            },
          }
        : {}),
    },
  })
)

export default function Clusters() {
  const theme = useTheme()
  const navigate = useNavigate()
  const cdIsEnabled = useCDEnabled()
  const [searchString, setSearchString] = useState()
  const debouncedSearchString = useDebounce(searchString, 100)
  const tabStateRef = useRef<any>(null)
  const [statusFilter, setStatusFilter] = useState<ClusterStatusTabKey>('ALL')
  const [selectedTagKeys, setSelectedTagKeys] = useState(new Set<Key>())
  const [virtualSlice, setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()
  const searchTags = useMemo(
    () =>
      Array.from(selectedTagKeys.values(), (tagKey) => keyToTag(`${tagKey}`)),
    [selectedTagKeys]
  )

  const [tagOp, setTagOp] = usePersistedState(
    'tag-search-operator',
    Conjunction.Or
  )

  const queryResult = useClustersQuery({
    variables: {
      q: debouncedSearchString,
      first: CLUSTERS_QUERY_PAGE_SIZE,
      ...(!isEmpty(searchTags)
        ? { tagQuery: { op: tagOp, tags: searchTags } }
        : {}),
      ...(statusFilter !== 'ALL'
        ? { healthy: statusFilter === 'HEALTHY' }
        : {}),
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const {
    error,
    fetchMore,
    loading,
    data: currentData,
    previousData,
  } = queryResult
  const data = currentData || previousData
  const clusters = data?.clusters
  const pageInfo = clusters?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: CLUSTERS_QUERY_PAGE_SIZE,
    key: 'clusters',
    interval: POLL_INTERVAL,
  })

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult.clusters, 'clusters'),
    })
  }, [fetchMore, pageInfo?.endCursor])
  const statusCounts = useMemo<Record<ClusterStatusTabKey, number | undefined>>(
    () => ({
      ALL: data?.clusterStatuses?.reduce(
        (count, status) => count + (status?.count || 0),
        0
      ),
      HEALTHY: data?.clusterStatuses ? 0 : undefined,
      UNHEALTHY: data?.clusterStatuses ? 0 : undefined,
      ...Object.fromEntries(
        data?.clusterStatuses?.map((status) => [
          status?.healthy ? 'HEALTHY' : 'UNHEALTHY',
          status?.count,
        ]) || []
      ),
    }),
    [data?.clusterStatuses]
  )

  const headerActions = useMemo(
    () =>
      cdIsEnabled ? (
        <div
          css={{
            display: 'flex',
            justifyContent: 'end',
            gap: theme.spacing.medium,
          }}
        >
          <IconFrame
            type="secondary"
            size="large"
            tooltip="Global settings"
            clickable
            icon={<GearTrainIcon />}
            onClick={() => navigate(GLOBAL_SETTINGS_ABS_PATH)}
          />
          <CreateCluster />
        </div>
      ) : null,
    [cdIsEnabled, navigate, theme.spacing.medium]
  )

  useSetPageHeaderContent(headerActions)
  useSetBreadcrumbs(CD_CLUSTERS_BASE_CRUMBS)

  const clusterEdges = data?.clusters?.edges
  const isDemo = statusCounts.ALL === 0 || !cdIsEnabled
  const tableData = isDemo ? DEMO_CLUSTERS : clusterEdges
  const showGettingStarted = isDemo || (statusCounts.ALL ?? 0) < 2

  useSetPageScrollable(showGettingStarted || isDemo)

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <>
      {!isDemo ? (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.small,
            height: '100%',
          }}
        >
          <ClustersFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchString={searchString}
            setSearchString={setSearchString}
            tabStateRef={tabStateRef}
            statusCounts={statusCounts}
            selectedTagKeys={selectedTagKeys}
            setSelectedTagKeys={setSelectedTagKeys}
            tagOp={tagOp}
            setTagOp={setTagOp}
          />
          <TabPanel
            stateRef={tabStateRef}
            css={{ height: '100%', overflow: 'hidden' }}
          >
            <FullHeightTableWrap>
              <ClustersTable
                data={tableData || []}
                refetch={refetch}
                virtualizeRows
                hasNextPage={pageInfo?.hasNextPage}
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={loading}
                reactVirtualOptions={CLUSTERS_REACT_VIRTUAL_OPTIONS}
                onVirtualSliceChange={setVirtualSlice}
              />
            </FullHeightTableWrap>
          </TabPanel>
        </div>
      ) : (
        <DemoTable mode={cdIsEnabled ? 'empty' : 'disabled'} />
      )}
      {showGettingStarted && <ClustersGettingStarted />}
    </>
  )
}
export const CLUSTERS_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export function ClustersTable({
  refetch,
  data,
  ...props
}: {
  refetch?: () => void
  data: any[]
} & Omit<ComponentProps<typeof Table>, 'data' | 'columns'>) {
  const navigate = useNavigate()
  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(() => ({ meta: { refetch } }), [refetch])

  return (
    <Table
      loose
      reactVirtualOptions={CLUSTERS_REACT_VIRTUAL_OPTIONS}
      data={data || []}
      columns={columns}
      reactTableOptions={reactTableOptions}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
      onRowClick={(_e, { original }: Row<Edge<ClustersRowFragment>>) =>
        navigate(
          getClusterDetailsPath({
            clusterId: original.node?.id,
          })
        )
      }
      {...props}
    />
  )
}
