import {
  Breadcrumb,
  EmptyState,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import { useNavigate } from 'react-router-dom'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import {
  BACKUPS_ABS_PATH,
  CLUSTERS_REL_PATH,
  getBackupsClusterAbsPath,
} from '../../../routes/backupRoutesConsts'
import { useClustersObjectStoresQuery } from '../../../generated/graphql'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import { GqlError } from '../../utils/Alert'

import ConfigureClusterBackups from './ConfigureClusterBackups'
import { ColActions, ColCluster, ColName, ColProvider } from './ClusterColumns'

export const BACKUPS_CLUSTERS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'backups', url: BACKUPS_ABS_PATH },
  {
    label: 'clusters',
    url: `${BACKUPS_ABS_PATH}/${CLUSTERS_REL_PATH}`,
  },
]

const columns = [ColCluster, ColProvider, ColName, ColActions]

export default function Clusters() {
  const theme = useTheme()
  const navigate = useNavigate()

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useClustersObjectStoresQuery, keyPath: ['clusters'] },
    { backups: true }
  )

  const clusters = data?.clusters

  const headerActions = useMemo(
    () => <ConfigureClusterBackups refetch={refetch} />,
    [refetch]
  )

  useSetPageHeaderContent(headerActions)
  useSetBreadcrumbs(BACKUPS_CLUSTERS_BASE_CRUMBS)

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
        <Table
          fullHeightWrap
          loose
          columns={columns}
          reactTableOptions={{ meta: { refetch } }}
          data={clusters?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          onRowClick={(_e, { original: { node } }) =>
            navigate(getBackupsClusterAbsPath(node?.id))
          }
        />
      ) : (
        <EmptyState message="Looks like you don't have any clusters with backups yet." />
      )}
    </div>
  )
}
