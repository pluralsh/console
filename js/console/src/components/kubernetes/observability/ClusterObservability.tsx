import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import styled from 'styled-components'

import { ClusterMetrics as ClusterMetricsView } from '../../cd/cluster/ClusterMetrics'
import { Logs } from '../../cd/logs/Logs'
import {
  getLogsAbsPath,
  getMetricsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { getBaseBreadcrumbs } from '../common/utils'

function useObservabilityBreadcrumbs(label: string, url: string) {
  const cluster = useCluster()

  useSetBreadcrumbs(
    useMemo(
      () => [...getBaseBreadcrumbs(cluster), { label, url }],
      [cluster, label, url]
    )
  )
}

export function ClusterMetrics() {
  const cluster = useCluster()
  const path = getMetricsAbsPath(cluster?.id)

  useObservabilityBreadcrumbs('metrics', path)

  return (
    <FillSC>
      <ContentSC $scrollable>
        <ClusterMetricsView
          basePath={path}
          inlineToggle
        />
      </ContentSC>
    </FillSC>
  )
}

export function ClusterLogs() {
  const cluster = useCluster()

  useObservabilityBreadcrumbs('logs', getLogsAbsPath(cluster?.id))

  return (
    <FillSC>
      <ContentSC>
        <Logs clusterId={cluster?.id} />
      </ContentSC>
    </FillSC>
  )
}

// absolutely filled so views get a definite height regardless of the flex chain above
const FillSC = styled.div({
  flex: 1,
  minHeight: 0,
  position: 'relative',
  width: '100%',
})

const ContentSC = styled.div<{ $scrollable?: boolean }>(
  ({ theme, $scrollable }) => ({
    display: 'flex',
    flexDirection: 'column',
    inset: 0,
    overflowY: $scrollable ? 'auto' : 'hidden',
    paddingTop: theme.spacing.medium,
    paddingBottom: theme.spacing.large,
    position: 'absolute',
  })
)
