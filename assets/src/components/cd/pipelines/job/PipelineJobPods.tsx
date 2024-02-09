import { useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'

import {
  ColActions,
  ColContainers,
  ColCpuReservation,
  ColImages,
  ColMemoryReservation,
  ColName,
  ColNamespace,
  ColRestarts,
  PodWithId,
  PodsList,
} from 'components/cluster/pods/PodsList'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useJobPods, usePipelineJob } from './PipelineJob'

const columns = [
  ColNamespace,
  ColName,
  ColMemoryReservation,
  ColCpuReservation,
  ColRestarts,
  ColContainers,
  ColImages,
  ColActions,
]

export default function PipelineJobLogs() {
  const pods = useJobPods()

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
