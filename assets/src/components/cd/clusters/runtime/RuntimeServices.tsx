import { Table } from '@pluralsh/design-system'
import { ClustersRowFragment, useRuntimeServicesQuery } from 'generated/graphql'
import { Key, useMemo, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

import { isNonNullable } from 'utils/isNonNullable'

import { runtimeColumns } from './columns'

const POLL_INTERVAL = 10 * 1000

export function getClusterKubeVersion(
  cluster: Nullable<Pick<ClustersRowFragment, 'currentVersion' | 'version'>>
) {
  return cluster?.currentVersion || cluster?.version || '1.20.0'
}

export default function RuntimeServices({
  cluster,
}: {
  cluster?: ClustersRowFragment | undefined | null
}) {
  const theme = useTheme()
  const kubeVersion = getClusterKubeVersion(cluster)
  const tabStateRef = useRef<any>()
  const [tabKey, setTabKey] = useState<Key>('blocking')
  const { data } = useRuntimeServicesQuery({
    variables: {
      kubeVersion,
      hasKubeVersion: true,
      id: cluster?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const addOns = useMemo(
    () => data?.cluster?.runtimeServices?.filter(isNonNullable) || [],
    [data?.cluster?.runtimeServices]
  )

  if ((data?.cluster?.runtimeServices || []).length <= 0)
    return <p style={{ marginLeft: '1rem' }}>No Add-Ons Detected</p>

  return (
    <>
      <Table
        data={addOns}
        columns={runtimeColumns}
        reactTableOptions={{ meta: { clusterId: cluster?.id } }}
        css={{
          maxHeight: 258,
          height: '100%',
        }}
      />
    </>
  )
}
