import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Pod } from 'generated/graphql'
import { A } from 'honorable'
import { Link } from 'react-router-dom'
import { podStatusToReadiness } from 'utils/status'

import { PhaseChip, StatusChip } from '../TableElements'
import { getPodContainersStats as getContainersStats } from '../containers/getPodContainersStats.tsx'
import { ContainerStatuses } from '../ContainerStatuses.tsx'

export default function PodSidecar({ pod }: { pod?: Pod | null }) {
  if (!pod) {
    return null
  }

  const readiness = podStatusToReadiness(pod.status)
  const containerStats = getContainersStats(pod.status)

  return (
    <Sidecar>
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
      <SidecarItem heading="Phase">
        <PhaseChip phase={pod?.status?.phase} />
      </SidecarItem>
      <SidecarItem heading="Status">
        <StatusChip readiness={readiness} />
      </SidecarItem>
      <SidecarItem heading="Containers">
        <ContainerStatuses statuses={containerStats.statuses || []} />
      </SidecarItem>
    </Sidecar>
  )
}
