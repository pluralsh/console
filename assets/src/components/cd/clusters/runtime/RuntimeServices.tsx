import { Table } from '@pluralsh/design-system'
import { ClustersRowFragment, useRuntimeServicesQuery } from 'generated/graphql'
import { useState } from 'react'
import { runtimeColumns } from './columns'

const POLL_INTERVAL = 10 * 1000

export default function RuntimeServices({
  cluster,
}: {
  cluster?: ClustersRowFragment | undefined | null
}) {
  const [kubeVersion, setKubeVersion] = useState(
    cluster?.currentVersion || cluster?.version || '1.20.0'
  )

  const { data } = useRuntimeServicesQuery({
    variables: {
      kubeVersion,
      id: cluster?.id ?? '',
    },
    pollInterval: POLL_INTERVAL,
  })
  console.log(data)

  if (!data) return null

  return (
    <Table
      data={data?.cluster?.runtimeServices || []}
      columns={runtimeColumns}
      css={{
        maxHeight: 310,
        height: '100%',
      }}
    />
  )
}
