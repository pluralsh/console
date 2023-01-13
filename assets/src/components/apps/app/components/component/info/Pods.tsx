import { Flex, H2 } from 'honorable'

import {
  ColContainers,
  ColCpuReservations,
  ColDelete,
  ColMemoryReservations,
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
      ...ColMemoryReservations,
      meta: {
        truncate: true,
      },
    },
    ColCpuReservations,
    ColRestarts,
    ColContainers,
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
