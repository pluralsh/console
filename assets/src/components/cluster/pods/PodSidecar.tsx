import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Pod } from 'generated/graphql'
import { A } from 'honorable'
import { useQuery } from 'react-apollo'
import { Link, useParams } from 'react-router-dom'
import { podStatusToReadiness } from 'utils/status'

import { POLL_INTERVAL } from '../constants'
import { POD_INFO_Q } from '../queries'
import { StatusChip } from '../TableElements'

export default function NodeSidecar() {
  const { name, namespace } = useParams()
  const { data } = useQuery<{
    pod: Pod
  }>(POD_INFO_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  if (!data) {
    return null
  }
  const { pod } = data
  const readiness = podStatusToReadiness(pod?.status)

  return (
    <Sidecar heading="Metadata">
      <SidecarItem heading="Pod name">{pod?.metadata?.name}</SidecarItem>
      <SidecarItem heading="Namespace">{pod?.metadata?.namespace}</SidecarItem>
      <SidecarItem heading="IP">{pod?.status?.podIp}</SidecarItem>
      <SidecarItem heading="Parent node">
        <A
          as={Link}
          to={`/nodes/${pod.spec.nodeName}`}
          inline
        >
          {pod.spec.nodeName}
        </A>
      </SidecarItem>
      <SidecarItem heading="Service account">
        {pod.spec.serviceAccountName}
      </SidecarItem>
      <SidecarItem heading="Status">
        <StatusChip readiness={readiness} />
      </SidecarItem>
    </Sidecar>
  )
}
