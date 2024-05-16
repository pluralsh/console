import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Pod } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { podStatusToReadiness } from 'utils/status'

import { useTheme } from 'styled-components'

import { StatusChip } from '../TableElements'

export default function PodSidecar({ pod }: { pod?: Pod | null }) {
  const theme = useTheme()

  if (!pod) {
    return null
  }

  const readiness = podStatusToReadiness(pod?.status)

  return (
    <Sidecar heading="Metadata">
      <SidecarItem heading="Pod name">{pod?.metadata?.name}</SidecarItem>
      <SidecarItem heading="Namespace">{pod?.metadata?.namespace}</SidecarItem>
      <SidecarItem heading="IP">{pod?.status?.podIp}</SidecarItem>
      <SidecarItem heading="Parent node">
        <Link
          css={{ ...theme.partials.text.inlineLink }}
          to={`/nodes/${pod.spec.nodeName}`}
        >
          {pod.spec.nodeName}
        </Link>
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
