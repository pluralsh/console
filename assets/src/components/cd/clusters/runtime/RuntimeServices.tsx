import { Table } from '@pluralsh/design-system'
import { ClustersRowFragment, RuntimeServicesQuery } from 'generated/graphql'
import { useMemo } from 'react'

import { isNonNullable } from 'utils/isNonNullable'

import { runtimeColumns } from './columns'

export function getClusterKubeVersion(
  cluster: Nullable<Pick<ClustersRowFragment, 'currentVersion' | 'version'>>
) {
  return cluster?.currentVersion || cluster?.version || '1.20.0'
}

export default function RuntimeServices({
  data,
}: {
  data?: RuntimeServicesQuery
}) {
  const addOns = useMemo(
    () => data?.cluster?.runtimeServices?.filter(isNonNullable) || [],
    [data?.cluster?.runtimeServices]
  )

  if ((data?.cluster?.runtimeServices || []).length <= 0)
    return <p style={{ marginLeft: '1rem' }}>No Add-Ons Detected</p>

  return (
    <Table
      data={addOns}
      columns={runtimeColumns}
      reactTableOptions={{ meta: { clusterId: data?.cluster?.id } }}
      css={{
        maxHeight: 258,
        height: '100%',
      }}
    />
  )
}
