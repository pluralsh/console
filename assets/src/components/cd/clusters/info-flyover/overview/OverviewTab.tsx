import { Card, Flex } from '@pluralsh/design-system'
import { MetadataPropSC } from 'components/cd/cluster/ClusterMetadata'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { getClusterDistroName } from 'components/utils/ClusterDistro'
import { ClusterProviderIcon } from 'components/utils/Provider'
import { TooltipTime } from 'components/utils/TooltipTime'
import {
  ClusterOverviewDetailsFragment,
  NodeStatisticHealth,
} from 'generated/graphql.ts'
import { isEmpty } from 'lodash'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { ClusterHealth, healthScoreToSeverity } from '../../ClusterHealthChip'
import { getClusterUpgradeInfo } from '../../ClusterUpgradeButton'
import { ClusterInfoFlyoverTab } from '../ClusterInfoFlyover'
import { componentHasInsight } from '../health/ConfigurationIssuesSection'
import { getPreFlightChecklist, UpgradeAccordionName } from '../UpgradesTab'
import { OverviewHeatmaps } from './OverviewHeatmaps'
import { OverviewTabCard } from './OverviewTabCard'
export function OverviewTab({
  cluster,
  setTab,
  setUpgradesInitialOpen,
}: {
  cluster: ClusterOverviewDetailsFragment
  setTab: (tab: ClusterInfoFlyoverTab) => void
  setUpgradesInitialOpen: (open: UpgradeAccordionName) => void
}) {
  const { chipLabel, severity } = getClusterUpgradeInfo(cluster)
  const upgradePlan = cluster.upgradePlan
  const metricsEnabled = useMetricsEnabled()

  return (
    <WrapperSC>
      <MetadataCard cluster={cluster} />
      <Flex gap="medium">
        <OverviewTabCard
          title="Cluster health score"
          subtitle="Determine your cluster's health score by its configuration and infrastructure."
          metric={`${cluster.healthScore ?? '-'}`}
          metricSeverity={healthScoreToSeverity(cluster.healthScore)}
          entries={[
            {
              label: 'Configuration issues',
              status: cluster.nodeStatistics?.some(
                (node) => node?.health !== NodeStatisticHealth.Healthy
              )
                ? 'warning'
                : 'success',
              onClick: () => setTab(ClusterInfoFlyoverTab.HealthScore),
            },
            {
              label: 'Infrastructure issues',
              status: isEmpty(
                cluster.insightComponents?.filter(componentHasInsight)
              )
                ? 'success'
                : 'warning',
              onClick: () => setTab(ClusterInfoFlyoverTab.HealthScore),
            },
          ]}
        />
        <OverviewTabCard
          title="Upgrade readiness"
          subtitle="Determine the upgrade readiness of your cluster at a glance."
          metric={chipLabel}
          metricSeverity={severity}
          entries={[
            {
              label: 'Pre-flight checklist',
              status: getPreFlightChecklist(upgradePlan).every((i) => !!i.value)
                ? 'success'
                : 'warning',
              onClick: () => {
                setTab(ClusterInfoFlyoverTab.Upgrades)
                setUpgradesInitialOpen(UpgradeAccordionName.Preflight)
              },
            },
            {
              label: 'API deprecations',
              status: upgradePlan?.deprecations ? 'success' : 'warning',
              onClick: () => {
                setTab(ClusterInfoFlyoverTab.Upgrades)
                setUpgradesInitialOpen(UpgradeAccordionName.Deprecations)
              },
            },
            {
              label: 'Add-on compatibilities',
              status: upgradePlan?.compatibilities ? 'success' : 'warning',
              onClick: () => {
                setTab(ClusterInfoFlyoverTab.Upgrades)
                setUpgradesInitialOpen(UpgradeAccordionName.AddOns)
              },
            },
            {
              label: 'Deprecated custom resources (optional)',
              status: isEmpty(cluster.deprecatedCustomResources)
                ? 'success'
                : 'pending',
              onClick: () => {
                setTab(ClusterInfoFlyoverTab.Upgrades)
                setUpgradesInitialOpen(UpgradeAccordionName.CustomResources)
              },
            },
          ]}
        />
      </Flex>
      {metricsEnabled && <OverviewHeatmaps clusterId={cluster.id} />}
    </WrapperSC>
  )
}

function MetadataCard({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
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
        <ClusterHealth cluster={cluster} />
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
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  width: '100%',
  height: '100%',
}))
