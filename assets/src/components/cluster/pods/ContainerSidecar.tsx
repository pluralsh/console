import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Container, Pod } from 'generated/graphql'
import { A } from 'honorable'
import { useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { Link, useParams } from 'react-router-dom'

import { POLL_INTERVAL } from '../constants'
import { POD_INFO_Q } from '../queries'

export default function NodeSidecar() {
  const { name, namespace, container: containerName } = useParams()
  const { data } = useQuery<{
    pod: Pod
  }>(POD_INFO_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const pod = data?.pod
  const container = useMemo(() => data?.pod?.spec?.containers?.find(cont => cont?.name === containerName),
    [containerName, data?.pod?.spec?.containers])

  if (!data || !pod || !container) {
    return null
  }

  return (
    <ContainerMetaData
      container={container}
      pod={data?.pod}
    />
  )
}

function ContainerMetaData({
  container,
  pod,
}: {
  pod: Pod
  container: Container
}) {
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
      <SidecarItem heading="Status">{pod.spec.serviceAccountName}</SidecarItem>
      <SidecarItem heading="Status">
        {/* <StatusChip readiness={containerStatusToReadiness(container?.)} /> */}
        TBD
      </SidecarItem>
      <SidecarItem heading="Started at">9999-99-99T00:00:00Z</SidecarItem>
    </Sidecar>
  )
}
