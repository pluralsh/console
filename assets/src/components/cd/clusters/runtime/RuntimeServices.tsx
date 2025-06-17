import { EmptyState, Table } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import {
  ClusterOverviewDetailsFragment,
  ClustersRowFragment,
} from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'

import { getClusterAddOnDetailsPath } from '../../../../routes/cdRoutesConsts'

import { isEmpty } from 'lodash'
import { RuntimeService, runtimeColumns } from './columns'

export function getClusterKubeVersion(
  cluster: Nullable<Pick<ClustersRowFragment, 'currentVersion' | 'version'>>
) {
  return cluster?.currentVersion || cluster?.version || '1.20.0'
}

export function RuntimeServices({
  cluster,
  flush,
}: {
  cluster: ClusterOverviewDetailsFragment
  flush?: boolean
}) {
  const navigate = useNavigate()
  const addOns = useMemo(
    () => cluster.runtimeServices?.filter(isNonNullable) || [],
    [cluster.runtimeServices]
  )

  if (isEmpty(addOns)) return <EmptyState message="No add-ons detected" />

  return (
    <Table
      flush={flush}
      data={addOns}
      columns={runtimeColumns}
      reactTableOptions={{ meta: { clusterId: cluster.id } }}
      onRowClick={(_, { original }: Row<RuntimeService>) =>
        navigate(
          getClusterAddOnDetailsPath({
            clusterId: cluster.id,
            addOnId: original?.id,
          })
        )
      }
      css={{
        maxHeight: 258,
        height: '100%',
      }}
    />
  )
}
