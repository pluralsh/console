import { Flex, H2 } from 'honorable'

import {
  ColContainers,
  ColCpuReservation,
  ColDelete,
  ColImages,
  ColMemoryReservation,
  ColNameLink,
  ColRestarts,
  PodsList,
} from 'components/cluster/pods/PodsList'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

export default function Pods({ pods }) {
  const { refetch } = useOutletContext<any>()

  const columns = useMemo(() => [
    ColNameLink,
    {
      ...ColMemoryReservation,
      meta: {
        truncate: true,
      },
    },
    ColCpuReservation,
    ColRestarts,
    ColContainers,
    ColImages,
    ColDelete(refetch),
  ],
  [refetch])

  return (
    <Flex direction="column">
      <H2
        subtitle1
        marginBottom="medium"
      >
        Pods
      </H2>
      <PodsList
        pods={pods}
        columns={columns}
      />
    </Flex>
  )
}
