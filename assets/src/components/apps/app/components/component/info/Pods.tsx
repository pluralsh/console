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

export default function Pods({
  pods, namespace, refetch,
}) {
  return (
    <Flex direction="column">
      <H2
        subtitle1
        marginBottom="medium"
      >Pods
      </H2>
      <PodsList
        pods={pods}
        columns={[
          ColName,
          ColNodeName,
          ColMemory,
          ColCpu,
          ColRestarts,
          ColContainers,
          ColDelete(namespace, refetch),
        ]}
        truncColIndexes={[0, 1]}
      />
    </Flex>
  )
}
