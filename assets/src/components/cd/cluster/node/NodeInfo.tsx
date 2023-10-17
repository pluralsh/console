import { useMemo } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { Card } from '@pluralsh/design-system'
import { Flex } from 'honorable'
import { Node, NodeMetric } from 'generated/graphql'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { isEmpty } from 'lodash'

import { SubTitle } from '../../../cluster/nodes/SubTitle'
import { NodeGraphs } from '../../../cluster/nodes/NodeGraphs'
import {
  ColContainers,
  ColCpuReservation,
  ColMemoryReservation,
  ColName,
  ColRestarts,
  PodWithId,
  PodsList,
} from '../../../cluster/pods/PodsList'
import { NODE_PARAM_NAME } from '../../../../routes/cdRoutesConsts'

export default function NodeInfo() {
  const params = useParams()
  const nodeName = params[NODE_PARAM_NAME] as string
  const { node, nodeMetric } = useOutletContext() as {
    node: Node
    nodeMetric: NodeMetric
  }

  const columns = useMemo(
    () => [
      ColName,
      ColMemoryReservation,
      ColCpuReservation,
      ColRestarts,
      ColContainers,
      // ColActions(refetch), // TODO: Update delete and details page.
    ],
    []
  )

  const pods = useMemo(() => {
    if (isEmpty(node?.pods)) {
      return undefined
    }
    const pods = node?.pods
      ?.map((pod) => ({ id: pod?.metadata?.namespace, ...pod }) as PodWithId)
      ?.filter((pod?: PodWithId): pod is PodWithId => !!pod) as PodWithId[]

    return pods || []
  }, [node])

  if (!node) return <LoadingIndicator />

  return (
    <Flex
      direction="column"
      gap="xlarge"
    >
      <section>
        <SubTitle>Overview</SubTitle>
        <Card padding="medium">
          <NodeGraphs
            status={node.status}
            pods={pods}
            name={nodeName}
            usage={nodeMetric.usage}
          />
        </Card>
      </section>
      <section>
        <SubTitle>Pods</SubTitle>
        <PodsList
          columns={columns}
          pods={pods}
        />
      </section>
    </Flex>
  )
}
