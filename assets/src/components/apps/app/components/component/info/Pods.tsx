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
import { useOutletContext } from 'react-router-dom'

export default function Pods({ pods }) {
  const { refetch } = useOutletContext<any>()

  const columns = useMemo(() => [
    ColName, // TODO: Make it link to pod.
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
