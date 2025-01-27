import { useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'

import {
  ColActions,
  ColContainers,
  ColCpuReservation,
  ColCreation,
  ColImages,
  ColMemoryReservation,
  ColName,
  ColNamespace,
  ColRestarts,
  PodWithId,
  PodsList,
} from 'components/cd/cluster/pod/PodsList'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useOutletContext } from 'react-router-dom'

import { useJobPods, useRunJob } from './RunJob'

const columns = [
  ColNamespace,
  ColName,
  ColMemoryReservation,
  ColCpuReservation,
  ColRestarts,
  ColContainers,
  ColImages,
  ColCreation,
  ColActions,
]

export default function RunJobPods() {
  const pods = useJobPods()
  const { clusterId } = useOutletContext() as { clusterId: string | undefined }

  const { refetch } = useRunJob()

  const podsWithId = useMemo(() => {
    if (isEmpty(pods)) {
      return undefined
    }
    const podsWithId = pods
      ?.map(
        (edge) =>
          ({
            id: `${edge?.metadata.name}++${edge?.metadata?.namespace}`,
            ...edge,
          }) as PodWithId
      )
      ?.filter((pod?: PodWithId): pod is PodWithId => !!pod) as PodWithId[]

    return podsWithId || []
  }, [pods])

  return (
    <ScrollablePage
      scrollable={false}
      heading="Pods"
    >
      <PodsList
        fullHeightWrap
        pods={podsWithId}
        clusterId={clusterId}
        linkToK8sDashboard
        columns={columns}
        refetch={refetch}
        // reactTableOptions={reactTableOptions}
      />
    </ScrollablePage>
  )
}
