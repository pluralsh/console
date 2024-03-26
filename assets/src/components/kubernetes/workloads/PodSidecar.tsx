import { ReactElement } from 'react'

import { useTheme } from 'styled-components'

import { Sidecar, SidecarItem } from '@pluralsh/design-system'

import { A } from 'honorable'
import { Link } from 'react-router-dom'

import { Pod_PodDetail as PodT } from '../../../generated/graphql-kubernetes'
import { StatusChip } from '../../cluster/TableElements'
import { ReadinessT } from '../../../utils/status'

interface PodSidecarProps {
  pod: Nullable<PodT>
}

export default function PodSidecar({ pod }: PodSidecarProps): ReactElement {
  return (
    <Sidecar heading="Metadata">
      <SidecarItem heading="Pod name">{pod?.objectMeta.name}</SidecarItem>
      <SidecarItem heading="Namespace">
        {pod?.objectMeta?.namespace}
      </SidecarItem>
      <SidecarItem heading="IP">{pod?.podIP}</SidecarItem>
      <SidecarItem heading="Parent node">
        <A
          as={Link}
          to={`/nodes/${pod?.nodeName}`}
          inline
        >
          {pod?.nodeName}
        </A>
      </SidecarItem>
      <SidecarItem heading="Service account">
        {pod?.serviceAccountName}
      </SidecarItem>
      <SidecarItem heading="Status">
        <StatusChip readiness={pod?.podPhase as ReadinessT} />
      </SidecarItem>
    </Sidecar>
  )
}
