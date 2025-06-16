import { Card, Flex } from '@pluralsh/design-system'
import { MetadataPropSC } from 'components/cd/cluster/ClusterMetadata'
import { getClusterDistroName } from 'components/utils/ClusterDistro'
import { ClusterProviderIcon } from 'components/utils/Provider'
import { TooltipTime } from 'components/utils/TooltipTime'
import { ClustersRowFragment } from 'generated/graphql.ts'
import styled, { useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime'
import { ClusterHealth } from '../ClusterHealthChip'
import { ClusterUtilizationHeatmaps } from 'components/cd/cluster/ClusterMetrics'

export function OverviewTab({ cluster }: { cluster: ClustersRowFragment }) {
  const { spacing } = useTheme()
  return (
    <WrapperSC>
      <MetadataCard cluster={cluster} />
      <Flex gap="medium">
        <Card css={{ padding: spacing.large, flex: 1 }}>
          Cluster health score
        </Card>
        <Card css={{ padding: spacing.large, flex: 1 }}>Upgrade readiness</Card>
      </Flex>
      <ClusterUtilizationHeatmaps
        customTooltips
        clusterId={cluster.id}
      />
    </WrapperSC>
  )
}

function MetadataCard({ cluster }: { cluster: ClustersRowFragment }) {
  return (
    <MetadataCardSC>
      <MetadataPropSC heading="Current K8s version">
        {cluster.currentVersion ? `v${cluster.currentVersion}` : '-'}
      </MetadataPropSC>
      <MetadataPropSC heading="Cloud">
        <Flex gap="xxsmall">
          <ClusterProviderIcon
            size={20}
            cluster={cluster}
          />
          <span>{getClusterDistroName(cluster?.distro, 'short')}</span>
        </Flex>
      </MetadataPropSC>
      <MetadataPropSC heading="Last pinged">
        {cluster?.pingedAt ? (
          <TooltipTime
            placement="top"
            date={cluster?.pingedAt}
          >
            <span>{fromNow(cluster?.pingedAt)}</span>
          </TooltipTime>
        ) : (
          '-'
        )}
      </MetadataPropSC>
      <MetadataPropSC heading="Agent health">
        <ClusterHealth
          size="small"
          cluster={cluster}
        />
      </MetadataPropSC>
    </MetadataCardSC>
  )
}

const MetadataCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing.large,
  gap: theme.spacing.small,
  width: '100%',
  height: '100%',
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  width: '100%',
  height: '100%',
}))
