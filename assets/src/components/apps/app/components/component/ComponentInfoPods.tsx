import { Flex, H2 } from 'honorable'

import {
  ColContainers,
  ColCpu,
  ColDelete,
  ColMemory,
  ColName,
  ColNodeName,
  ColRestarts,
  PodList,
} from '../../../../cluster/pods/PodList'

export default function ComponentInfoPods({
  pods, namespace, refetch,
}) {
  return (
    <Flex direction="column">
      <H2 marginBottom="medium">Pods</H2>
      <PodList
        pods={pods}
        columns={[
          ColName,
          ColNodeName,
          ColMemory,
          ColCpu,
          ColRestarts,
          ColContainers, // TODO: Add tooltip for containers.
          ColDelete(namespace, refetch),
        ]}
        truncColIndex={1}
      />
    </Flex>
  )
}
