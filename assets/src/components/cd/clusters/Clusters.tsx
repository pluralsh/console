import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  Breadcrumb,
  GearTrainIcon,
  IconFrame,
  TabPanel,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ComponentProps, Key, useMemo, useRef, useState } from 'react'
import { Row } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import chroma from 'chroma-js'
import { useDebounce } from '@react-hooks-library/core'

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

import { Edge } from 'utils/graphql'
import { keyToTag } from 'utils/clusterTags'
import usePersistedState from 'components/hooks/usePersistedState'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { isEmpty } from 'lodash'

import {
  useSetPageHeaderContent,
  useSetPageScrollable,
} from '../ContinuousDeployment'
import { useCDEnabled } from '../utils/useCDEnabled'
import { DEMO_CLUSTERS } from '../utils/demoData'

import {
  ClusterStatusTabKey,
  ClustersFilters,
} from '../services/ClustersFilters'

import { ClusterTagsFilter } from '../services/ClusterTagsFilter'

import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'

import CreateCluster from './create/CreateCluster'
import { DemoTable } from './ClustersDemoTable'
import { ClustersGettingStarted } from './ClustersGettingStarted'
import { cdClustersColumns } from './ClustersColumns'

export const CD_CLUSTERS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'cd', url: '/cd' },
  { label: 'clusters', url: `${CD_REL_PATH}/${CLUSTERS_REL_PATH}` },
]

export const CLUSTERS_QUERY_PAGE_SIZE = 100

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
  const tabStateRef = useRef<any>(null)
  const [statusFilter, setStatusFilter] = useState<ClusterStatusTabKey>('ALL')
  const [selectedTagKeys, setSelectedTagKeys] = useState(new Set<Key>())

  const [searchString, setSearchString] = useState<string>()
  const debouncedSearchString = useDebounce(searchString, 100)

  const searchTags = useMemo(
    () =>
      Array.from(selectedTagKeys.values(), (tagKey) => keyToTag(`${tagKey}`)),
    [selectedTagKeys]
  )

  const [tagOp, setTagOp] = usePersistedState(
    'tag-search-operator',
    Conjunction.Or
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
      queryHook: useClustersQuery,
      pageSize: CLUSTERS_QUERY_PAGE_SIZE,
      queryKey: 'clusters',
    },
    {
      q: debouncedSearchString,
      ...(statusFilter !== 'ALL'
        ? { healthy: statusFilter === 'HEALTHY' }
        : {}),
      ...(!isEmpty(searchTags)
        ? { tagQuery: { op: tagOp, tags: searchTags } }
        : {}),
    }
  )

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
            setQueryStatusFilter={setStatusFilter}
            setQueryString={setSearchString}
            tabStateRef={tabStateRef}
            statusCounts={statusCounts}
            selectedTagKeys={selectedTagKeys}
            setSelectedTagKeys={setSelectedTagKeys}
            tagOp={tagOp}
            setTagOp={
              setTagOp as ComponentProps<
                typeof ClusterTagsFilter
              >['setSearchOp']
            }
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
  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  return (
    <Table
      loose
      reactVirtualOptions={CLUSTERS_REACT_VIRTUAL_OPTIONS}
      data={data || []}
      columns={cdClustersColumns}
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
