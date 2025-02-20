import { Flex } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { MetadataGrid, MetadataItem } from 'components/utils/Metadata'
import { Node } from 'generated/graphql'
import { useOutletContext } from 'react-router-dom'
import { nodeStatusToReadiness } from 'utils/status'

import { LabelsAnnotations } from '../../../cluster/LabelsAnnotations'
import { StatusChip } from '../../../cluster/TableElements'

export default function NodeMetadata() {
  const { node } = useOutletContext() as { node: Node }

  if (!node) return <LoadingIndicator />

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
