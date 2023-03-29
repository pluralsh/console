import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { Event, NodeMetric, Node as NodeT, Pod } from 'generated/graphql'
import { nodeStatusToReadiness } from 'utils/status'
import { MetadataGrid, MetadataItem } from 'components/utils/Metadata'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { POLL_INTERVAL } from '../constants'
import { NODE_Q } from '../queries'
import { LabelsAnnotations } from '../LabelsAnnotations'
import { StatusChip } from '../TableElements'

export const podContainers = (pods) =>
  pods
    .filter(({ status: { phase } }) => phase !== 'Succeeded')
    .map(({ spec: { containers } }) => containers)
    .flat()

export default function NodeInfo() {
  const { name } = useParams()

  const { data } = useQuery<{
    node: NodeT & {
      raw?: string
      pods?: Pod[]
      events?: Event[]
    }
    nodeMetric: NodeMetric
  }>(NODE_Q, {
    variables: { name },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  if (!data) return <LoadingIndicator />

  const { node } = data
  const readiness = nodeStatusToReadiness(node?.status)

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <MetadataGrid heading="Metadata">
        <MetadataItem heading="Name">{node.metadata.name}</MetadataItem>
        <MetadataItem heading="Status">
          <StatusChip readiness={readiness} />
        </MetadataItem>
      </MetadataGrid>
      <LabelsAnnotations
        metadata={node.metadata}
        maxHeight="100%"
        overflow="auto"
      />
    </Flex>
  )
}
