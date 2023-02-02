import { EmptyState } from '@pluralsh/design-system'
import { A } from 'honorable'
import { Link } from 'react-router-dom'
import { containerStatusToReadiness } from 'utils/status'

import { ContainerStatusChip } from '../TableElements'

import { MetadataGrid, MetadataItem } from '../../utils/Metadata'

import { useContainer } from './Container'

export default function ContainerMetadata() {
  const containerContext = useContainer()

  if (!containerContext) {
    return <EmptyState message="This container has no metadata" />
  }
  const { container, containerStatus, pod } = containerContext

  return (
    <MetadataGrid>
      <MetadataItem heading="Container name">{container?.name}</MetadataItem>
      <MetadataItem heading="Parent pod">
        <A
          inline
          as={Link}
          to={`/pods/${pod?.metadata.namespace}/${pod?.metadata.name}`}
        >
          {pod?.metadata.name}
        </A>
      </MetadataItem>
      {container?.ports && container?.ports?.length > 0 && (
        <MetadataItem heading="Ports">
          {container.ports.map(port => (
            <div>
              {port?.protocol ? `${port.protocol} ` : ''}
              {port?.containerPort}
            </div>
          ))}
        </MetadataItem>
      )}
      {pod?.status?.podIp && (
        <MetadataItem heading="IP">{pod.status.podIp}</MetadataItem>
      )}
      <MetadataItem heading="Image">{container?.image}</MetadataItem>
      <MetadataItem heading="Service account">
        {pod.spec.serviceAccountName}
      </MetadataItem>
      <MetadataItem heading="Status">
        <ContainerStatusChip
          readiness={containerStatusToReadiness(containerStatus)}
        />
      </MetadataItem>
      {containerStatus?.state?.running?.startedAt && (
        <MetadataItem heading="Started at">
          {containerStatus?.state?.running?.startedAt}
        </MetadataItem>
      )}
    </MetadataGrid>
  )
}
