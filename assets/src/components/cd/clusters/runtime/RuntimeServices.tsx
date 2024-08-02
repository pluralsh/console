import { Table } from '@pluralsh/design-system'
import { ClustersRowFragment, RuntimeServicesQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { useNavigate } from 'react-router-dom'
import { Row } from '@tanstack/react-table'

import { getClusterAddOnDetailsPath } from '../../../../routes/cdRoutesConsts'

import { RuntimeService, runtimeColumns } from './columns'

export function getClusterKubeVersion(
  cluster: Nullable<Pick<ClustersRowFragment, 'currentVersion' | 'version'>>
) {
  return cluster?.currentVersion || cluster?.version || '1.20.0'
}

export default function RuntimeServices({
  data,
  flush,
}: {
  data?: RuntimeServicesQuery
  flush?: boolean
}) {
  const navigate = useNavigate()
  const addOns = useMemo(
    () => data?.cluster?.runtimeServices?.filter(isNonNullable) || [],
    [data?.cluster?.runtimeServices]
  )

  if ((data?.cluster?.runtimeServices || []).length <= 0)
    return <p style={{ marginLeft: '1rem' }}>No Add-Ons Detected</p>

  return (
    <Table
      flush={flush}
      data={addOns}
      columns={runtimeColumns}
      reactTableOptions={{ meta: { clusterId: data?.cluster?.id } }}
      onRowClick={(_, { original }: Row<RuntimeService>) =>
        navigate(
          getClusterAddOnDetailsPath({
            clusterId: data?.cluster?.id,
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
