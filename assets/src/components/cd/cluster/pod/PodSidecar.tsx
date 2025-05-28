import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Pod } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { PhaseT, podStatusToReadiness } from 'utils/status'

import { getNodeDetailsPath } from '../../../../routes/cdRoutesConsts.tsx'
import { ContainerStatuses } from '../../../cluster/ContainerStatuses.tsx'
import { PhaseChip, StatusChip } from '../../../cluster/TableElements.tsx'
import { getPodContainersStats } from '../../../cluster/containers/getPodContainersStats.tsx'
import { useTheme } from 'styled-components'
import { getResourceDetailsAbsPath } from '../../../../routes/kubernetesRoutesConsts.tsx'
import { Kind } from '../../../kubernetes/common/types.ts'

export default function PodSidecar({
  pod,
  clusterId,
}: {
  pod: Pod
  clusterId?: string
}) {
  const theme = useTheme()
  const readiness = podStatusToReadiness(pod.status)
  const containerStats = getPodContainersStats(pod.status)

  return (
    <Sidecar>
      <SidecarItem heading="Pod name">{pod.metadata?.name}</SidecarItem>
      <SidecarItem heading="Pod namespace">
        {pod.metadata?.namespace}
      </SidecarItem>
      <SidecarItem heading="IP">{pod.status?.podIp}</SidecarItem>
      <SidecarItem heading="Parent node">
        {clusterId ? (
          <Link
            css={theme.partials.text.inlineLink}
            to={getResourceDetailsAbsPath(
              clusterId,
              Kind.Node,
              pod.spec.nodeName
            )}
          >
            {pod.spec.nodeName}
          </Link>
        ) : (
          <Link
            css={theme.partials.text.inlineLink}
            to={`/nodes/${pod.spec.nodeName}`}
          >
            {pod.spec.nodeName}
          </Link>
        )}
      </SidecarItem>
      <SidecarItem heading="Service account">
        {pod.spec.serviceAccountName}
      </SidecarItem>
      <SidecarItem heading="Phase">
        <PhaseChip phase={pod.status?.phase as PhaseT} />
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
