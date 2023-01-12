import { Flex, H2 } from 'honorable'

import {
  ColContainers,
  ColCpu,
  ColDelete,
  ColMemory,
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
      ...ColMemory,
      meta: {
        truncate: true,
      },
    },
    ColCpu,
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
