import {
  ArrowTopRightIcon,
  Breadcrumb,
  EmptyState,
  IconFrame,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ComponentProps, useCallback, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { Link } from 'react-router-dom'

import { VirtualItem } from '@tanstack/react-virtual'

import {
  BACKUPS_ABS_PATH,
  BACKUPS_REL_PATH,
} from '../../../routes/backupRoutesConsts'
import {
  ClustersObjectStoresFragment,
  useClustersObjectStoresQuery,
} from '../../../generated/graphql'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import { GqlError } from '../../utils/Alert'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import {
  ObjectStoreCloudIcon,
  getObjectStoreCloud,
  objectStoreCloudToDisplayName,
} from '../objectstores/utils'
import { ColWithIcon } from '../../utils/table/ColWithIcon'
import { DynamicClusterIcon } from '../../cd/clusters/DynamicClusterIcon'
import { ColClusterContentSC } from '../../cd/clusters/ClustersColumns'

import { useSlicePolling } from '../../utils/tableFetchHelpers'

import { Edge, extendConnection } from '../../../utils/graphql'

import { StackedText } from '../../utils/table/StackedText'

import { BasicLink } from '../../utils/typography/BasicLink'

import ConfigureClusterBackups from './ConfigureClusterBackups'
import { DeleteClusterBackups } from './DeleteClusterBackups'

const POLL_INTERVAL = 10 * 1000
const QUERY_PAGE_SIZE = 100

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const BACKUPS_BACKUPS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'backups', url: BACKUPS_ABS_PATH },
  {
    label: 'backups',
    url: `${BACKUPS_ABS_PATH}/${BACKUPS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<Edge<ClustersObjectStoresFragment>>()

const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'cluster',
    header: 'Cluster',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({
      row: {
        original: { node: cluster },
      },
    }) => (
      <ColClusterContentSC>
        <DynamicClusterIcon
          deleting={!!cluster?.deletedAt}
          protect={!!cluster?.protect}
          self={!!cluster?.self}
        />
        <StackedText
          first={
            <BasicLink css={{ whiteSpace: 'nowrap' }}>
              {cluster?.name}
            </BasicLink>
          }
          second={`handle: ${cluster?.handle}`}
        />
      </ColClusterContentSC>
    ),
  }),
  columnHelper.accessor(({ node }) => node?.objectStore, {
    id: 'provider',
    header: 'Storage provider',
    cell: ({ getValue }) => {
      const cloud = getObjectStoreCloud(getValue())

      if (!cloud) return null

      return (
        <ColWithIcon
          truncateLeft
          icon={<ObjectStoreCloudIcon cloud={cloud} />}
        >
          {objectStoreCloudToDisplayName[cloud]}
        </ColWithIcon>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node?.objectStore?.name, {
    id: 'name',
    header: 'Storage name',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: ({
      table,
      row: {
        original: { node },
      },
      getValue,
    }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()
      const { refetch } = table.options.meta as { refetch?: () => void }

      return (
        <div
          css={{
            display: 'flex',
            flexGrow: 0,
            gap: theme.spacing.medium,
            alignItems: 'center',
            alignSelf: 'end',
          }}
        >
          <DeleteClusterBackups
            cluster={node}
            refetch={refetch}
          />
          <IconFrame
            type="tertiary"
            icon={<ArrowTopRightIcon />}
            as={Link}
            to={`/backups/backups/${getValue()}`}
          />
        </div>
      )
    },
  }),
]

export default function Backups() {
  const theme = useTheme()
  const [virtualSlice, _setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()
  const queryResult = useClustersObjectStoresQuery({
    variables: { backups: true, first: QUERY_PAGE_SIZE },
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
    pageSize: QUERY_PAGE_SIZE,
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

  const headerActions = useMemo(
    () => <ConfigureClusterBackups refetch={refetch} />,
    [refetch]
  )

  useSetPageHeaderContent(headerActions)
  useSetBreadcrumbs(BACKUPS_BACKUPS_BASE_CRUMBS)

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      {!isEmpty(clusters?.edges) ? (
        <FullHeightTableWrap>
          <Table
            loose
            columns={columns}
            reactTableOptions={{ meta: { refetch } }}
            reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
            data={clusters?.edges || []}
            virtualizeRows
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any clusters with backups yet." />
      )}
    </div>
  )
}
