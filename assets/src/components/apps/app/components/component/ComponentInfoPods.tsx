import { Flex, H2 } from 'honorable'

import {
  ColContainers,
  ColCpu,
  ColMemory,
  ColName,
  ColNodeName,
  ColRestarts,
  PodList,
} from '../../../../cluster/pods/PodList'

export default function ComponentInfoPods({
  pods, refetch: _refetch, // Will need refetch once delete is implemented
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
          ColContainers,
          // TODO: Add tooltip for containers and add delete button.
        ]}
        truncColIndex={1}
      />
    </Flex>
  )
}
