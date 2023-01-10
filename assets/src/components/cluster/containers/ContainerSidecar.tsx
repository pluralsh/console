import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import {
  Container,
  ContainerStatus,
  Maybe,
  Pod,
} from 'generated/graphql'
import { A } from 'honorable'

import { Link } from 'react-router-dom'
import { containerStatusToReadiness } from 'utils/status'

import { StatusChip } from '../TableElements'

type ContainerSidecarProps = {
  pod: Pod
  container?: Maybe<Container>
  containerStatus?: Maybe<ContainerStatus>
}

export default function ContainerSidecar({
  container,
  containerStatus,
  pod,
}: ContainerSidecarProps) {
  return (
    <Sidecar heading="Metadata">
      <SidecarItem heading="Container name">{container?.name}</SidecarItem>
      <SidecarItem heading="Parent pod">
        <A
          inline
          as={Link}
          to={`/pods/${pod?.metadata.namespace}/${pod?.metadata.name}`}
        >
          {pod?.metadata.name}
        </A>
      </SidecarItem>
      <SidecarItem heading="Ports">
        {container?.ports?.map(port => (
          <div>
            {port?.protocol ? `${port.protocol} ` : ''}
            {port?.containerPort}
          </div>
        ))}
      </SidecarItem>
      <SidecarItem heading="IP">{pod?.status?.podIp}</SidecarItem>
      <SidecarItem heading="Image">{container?.image}</SidecarItem>
      <SidecarItem heading="Service account">
        {pod.spec.serviceAccountName}
      </SidecarItem>
      <SidecarItem heading="Status">
        <StatusChip readiness={containerStatusToReadiness(containerStatus)} />
      </SidecarItem>
      {containerStatus?.state?.running?.startedAt && (
        <SidecarItem heading="Started at">
          {containerStatus?.state?.running?.startedAt}
        </SidecarItem>
      )}
    </Sidecar>
  )
}
