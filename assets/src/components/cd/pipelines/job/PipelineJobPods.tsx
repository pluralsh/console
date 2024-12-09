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
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useOutletContext } from 'react-router-dom'

import { useJobPods, usePipelineJob } from './PipelineJob'

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

export default function PipelineJobLogs() {
  const pods = useJobPods()

  const { clusterId } = useOutletContext() as { clusterId: string | undefined }

  const { refetch } = usePipelineJob()

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
      <FullHeightTableWrap>
        <PodsList
          pods={podsWithId}
          clusterId={clusterId}
          linkToK8sDashboard
          columns={columns}
          refetch={refetch}
          //   reactTableOptions={reactTableOptions}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </ScrollablePage>
  )
}
