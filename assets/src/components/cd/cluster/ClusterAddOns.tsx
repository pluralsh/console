import { EmptyState, Table } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useRuntimeServicesQuery } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { getClusterAddOnDetailsPath } from 'routes/cdRoutesConsts'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { clusterAddonsColumns } from '../clusters/runtime/columns'
import { POLL_INTERVAL } from '../ContinuousDeployment'
import ExpandedColumn from '../clusters/runtime/ExpandedColumn'

import { getClusterKubeVersion } from '../clusters/runtime/RuntimeServices'

import { useClusterContext } from './Cluster'

export default function ClusterAddOns() {
  const navigate = useNavigate()
  const { cluster } = useClusterContext()
  const kubeVersion = getClusterKubeVersion(cluster)
  const { data } = useRuntimeServicesQuery({
    variables: {
      kubeVersion,
      hasKubeVersion: !!kubeVersion,
      id: cluster?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const all = useMemo(
    () => data?.cluster?.runtimeServices?.filter(isNonNullable) || [],
    [data?.cluster?.runtimeServices]
  )

  if (!data) {
    return <LoadingIndicator />
  }

  if ((data?.cluster?.runtimeServices || []).length <= 0)
    return <EmptyState message="This cluster doesn’t have any add-ons." />

  return (
    <FullHeightTableWrap>
      <Table
        data={all}
        columns={clusterAddonsColumns}
        renderExpanded={({ row }) => (
          <ExpandedColumn runtimeService={row.original} />
        )}
        onRowClick={(_, row) => {
          navigate(
            getClusterAddOnDetailsPath({
              clusterId: cluster.id,
              addOnId: row.id,
            })
          )
        }}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
