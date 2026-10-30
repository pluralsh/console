import {
  Breadcrumb,
  Button,
  Flex,
  HeatMapIcon,
  Table,
  TableProps,
  WrapWithIf,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import chroma from 'chroma-js'
import { ComponentProps, Key, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import {
  ClustersRowFragment,
  Conjunction,
  Homepage,
  useClusterStatusesQuery,
} from 'generated/graphql'
import { ClustersDocument } from 'generated/graphql-documents'

import { useLogin } from 'components/contexts'

import {
  CD_REL_PATH,
  CLUSTERS_REL_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'

import usePersistedState from 'components/hooks/usePersistedState'
import { GqlError } from 'components/utils/Alert'
import { keySetToTagArray } from 'utils/clusterTags'
import { Edge } from 'utils/graphql'

import { isEmpty } from 'lodash'

import { ToolbarSearchInput } from 'components/layout/PageToolbar'

import {
  STATUS_COUNTS_POLL_INTERVAL,
  useSetPageHeaderContent,
  useSetPageScrollable,
} from '../ContinuousDeployment'
import { DEMO_CLUSTERS } from '../utils/demoData'
import { useCDEnabled } from '../utils/useCDEnabled'

import {
  ClusterStatusTabKey,
  ClustersFilters,
  UpgradeableFilterKey,
} from '../services/ClustersFilters'

import { TagsFilter } from '../services/ClusterTagsFilter'

import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

import { useProjectId } from '../../contexts/ProjectsContext'

import { isNonNullable } from 'utils/isNonNullable.ts'
import {
  dayjsExtended as dayjs,
  dayjsExtended,
} from '../../../utils/datetime.ts'
import { useOnboarded } from '../../contexts/DeploymentSettingsContext.tsx'
import { GettingStartedBlock } from '../../home/GettingStarted.tsx'
import { ClustersCharts } from './ClustersCharts.tsx'
import { cdClustersColumns } from './ClustersColumns'
import {
  CLUSTER_DELTA_FALLBACK_POLL_INTERVAL,
  useClusterDeltas,
} from './useClusterDeltas'
import { DemoTable } from './ClustersDemoTable'
import CreateCluster from './create/CreateCluster'
import {
  ClusterInfoFlyover,
  ClusterInfoFlyoverTab,
} from './info-flyover/ClusterInfoFlyover.tsx'

export const CD_CLUSTERS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'cd', url: '/cd' },
  { label: 'clusters', url: `${CD_REL_PATH}/${CLUSTERS_REL_PATH}` },
]

type TableWrapperSCProps = {
  $blurred: boolean
}

export type ClustersTableMeta = {
  now: dayjsExtended.Dayjs
  refetch: () => void
  setFlyoverTab: (tab: ClusterInfoFlyoverTab) => void
  setSelectedCluster: (cluster: ClustersRowFragment) => void
}

export const TableWrapperSC = styled.div<TableWrapperSCProps>(
  ({ theme, $blurred }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
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
  const projectId = useProjectId()
  const { me } = useLogin()
  const cdIsEnabled = useCDEnabled()
  const onboarded = useOnboarded()
  const [showingCharts, setShowingCharts] = usePersistedState('cd-charts', true)
  const [statusFilter, setStatusFilter] = useState<ClusterStatusTabKey>('ALL')
  const [selectedTagKeys, setSelectedTagKeys] = useState(new Set<Key>())
  const [upgradeableFilter, setUpgradeableFilter] =
    useState<UpgradeableFilterKey>('ALL')

  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 400) || undefined

  const searchTags = useMemo(
    () => keySetToTagArray(selectedTagKeys),
    [selectedTagKeys]
  )

  const [tagOp, setTagOp] = usePersistedState(
    'tag-search-operator',
    Conjunction.Or
  )

  const tagQuery = useMemo(
    () => (isEmpty(searchTags) ? undefined : { op: tagOp, tags: searchTags }),
    [searchTags, tagOp]
  )

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      pollInterval: CLUSTER_DELTA_FALLBACK_POLL_INTERVAL,
      query: ClustersDocument,
      keyPath: ['clusters'],
    },
    {
      q: debouncedSearchString,
      projectId,
      ...(statusFilter !== 'ALL'
        ? { healthy: statusFilter === 'HEALTHY' }
        : {}),
      tagQuery,
      upgradeable:
        upgradeableFilter === 'ALL'
          ? undefined
          : upgradeableFilter === 'UPGRADEABLE',
    }
  )
  useClusterDeltas({ refetchOnCreate: refetch })
  const {
    data: aggData,
    previousData: aggPrev,
    loading: aggLoading,
  } = useClusterStatusesQuery({
    variables: { q: debouncedSearchString, projectId, tagQuery },
    fetchPolicy: 'cache-and-network',
    pollInterval: STATUS_COUNTS_POLL_INTERVAL,
  })
  const { clusterStatuses, upgradeStatistics } = (aggData || aggPrev) ?? {}

  const statusCounts = useMemo<Record<ClusterStatusTabKey, number | undefined>>(
    () => ({
      ALL: clusterStatuses?.reduce(
        (count, status) => count + (status?.count || 0),
        0
      ),
      HEALTHY: clusterStatuses ? 0 : undefined,
      UNHEALTHY: clusterStatuses ? 0 : undefined,
      ...Object.fromEntries(
        clusterStatuses?.map((status) => [
          status?.healthy ? 'HEALTHY' : 'UNHEALTHY',
          status?.count,
        ]) || []
      ),
    }),
    [clusterStatuses]
  )

  const clusterEdges = useMemo(
    () => data?.clusters?.edges?.filter(isNonNullable) ?? [],
    [data?.clusters?.edges]
  )
  const hasStatFilters = !!debouncedSearchString || !!projectId || !!tagQuery
  const isDemo = (statusCounts.ALL === 0 && !hasStatFilters) || !cdIsEnabled
  const tableData: Edge<ClustersRowFragment>[] = isDemo
    ? DEMO_CLUSTERS
    : clusterEdges
  const showGettingStarted = !onboarded && tableData && tableData?.length < 2
  const canShowCharts =
    me?.homepage !== Homepage.Clusters && !showGettingStarted

  useSetPageScrollable(isDemo)

  const headerActions = useMemo(
    () =>
      cdIsEnabled ? (
        <>
          <ToolbarSearchInput
            placeholder="Search clusters"
            value={searchString}
            onChange={setSearchString}
          />
          {canShowCharts && !showingCharts && (
            <Button
              secondary
              small
              endIcon={<HeatMapIcon />}
              onClick={() => setShowingCharts(true)}
            >
              Show charts
            </Button>
          )}
          <CreateCluster />
        </>
      ) : null,
    [cdIsEnabled, searchString, canShowCharts, showingCharts, setShowingCharts]
  )

  useSetPageHeaderContent(headerActions)
  useSetBreadcrumbs(CD_CLUSTERS_BASE_CRUMBS)
  if (error) return <GqlError error={error} />

  return !isDemo ? (
    <Flex
      direction="column"
      gap="small"
      height="100%"
      overflow="auto"
      minHeight={0}
    >
      {canShowCharts && (
        <ClustersCharts
          show={showingCharts}
          setShow={setShowingCharts}
        />
      )}
      <ClustersFilters
        setQueryStatusFilter={setStatusFilter}
        statusCounts={statusCounts}
        selectedTagKeys={selectedTagKeys}
        setSelectedTagKeys={setSelectedTagKeys}
        tagOp={tagOp}
        setTagOp={setTagOp as ComponentProps<typeof TagsFilter>['setSearchOp']}
        upgradeableFilter={upgradeableFilter}
        setUpgradeableFilter={setUpgradeableFilter}
        upgradeStats={upgradeStatistics}
        loadingStatuses={aggLoading}
      />
      <WrapWithIf
        condition={showGettingStarted}
        wrapper={
          <Flex
            css={{
              border: theme.borders['fill-two'],
              borderRadius: theme.borderRadiuses.medium,
            }}
            direction="column"
            overflow="auto"
            height="100%"
          />
        }
      >
        <ClustersTable
          loading={!data && loading}
          flush={showGettingStarted}
          fullHeightWrap={!showGettingStarted}
          data={tableData || []}
          refetch={refetch}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          {...(tableData.length > 3 && showingCharts && { minHeight: 350 })}
        />

        {showGettingStarted && <GettingStartedBlock />}
      </WrapWithIf>
    </Flex>
  ) : (
    <DemoTable mode={cdIsEnabled ? 'empty' : 'disabled'} />
  )
}

export function ClustersTable({
  data,
  refetch,
  columns = cdClustersColumns,
  selectedCluster: selectedClusterProp,
  setSelectedCluster: setSelectedClusterProp,
  ...props
}: {
  data: Edge<ClustersRowFragment>[]
  refetch: () => void
  columns?: TableProps['columns']
  // for cases when parent wants to control the selected cluster
  selectedCluster?: Nullable<ClustersRowFragment>
  setSelectedCluster?: (cluster: Nullable<ClustersRowFragment>) => void
} & Omit<TableProps, 'data' | 'columns'>) {
  const [selectedClusterInternal, setSelectedClusterInternal] =
    useState<Nullable<ClustersRowFragment>>(null)
  const [flyoverTab, setFlyoverTab] = useState(ClusterInfoFlyoverTab.Overview)

  const selectedCluster = selectedClusterProp ?? selectedClusterInternal
  const setSelectedCluster =
    setSelectedClusterProp ?? setSelectedClusterInternal

  const [now, setNow] = useState(dayjs())

  useEffect(() => {
    const int = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(int)
  }, [])

  const reactTableOptions: { meta: ClustersTableMeta } = {
    meta: { now, refetch, setFlyoverTab, setSelectedCluster },
  }

  return (
    <>
      <Table
        data={data || []}
        columns={columns}
        reactTableOptions={reactTableOptions}
        getRowLink={({ original }) => {
          const { node } = original as Edge<ClustersRowFragment>
          return <Link to={getClusterDetailsPath({ clusterId: node?.id })} />
        }}
        {...props}
      />
      <ClusterInfoFlyover
        open={isNonNullable(selectedCluster)}
        onClose={() => setSelectedCluster(null)}
        cluster={selectedCluster}
        initialTab={flyoverTab}
      />
    </>
  )
}
