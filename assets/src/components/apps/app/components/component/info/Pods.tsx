import { Flex, H2 } from 'honorable'

import {
  ColContainers,
  ColCpu,
  ColDelete,
  ColMemory,
  ColName,
  ColNodeName,
  ColRestarts,
  PodsList,
} from 'components/cluster/pods/PodsList'
import { useMemo } from 'react'

export default function Pods({ pods, refetch }) {
  const columns = useMemo(() => [
    ColName,
    ColNodeName,
    ColMemory,
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
        truncColIndexes={[0, 1]}
      />
    </Flex>
  )
}
