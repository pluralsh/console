import {
  CheckRoundedIcon,
  Chip,
  ChipSeverity,
  ErrorIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { ClusterTinyFragment, ClustersRowFragment } from 'generated/graphql'
import { ClusterTableChipSC } from './ClusterHealthChip'

export function ClusterUpgradeButton({
  cluster,
  onClick,
}: {
  cluster?: Nullable<ClustersRowFragment>
  onClick: () => void
}) {
  const { chipLabel, severity } = getClusterUpgradeInfo(cluster)

  return (
    <ClusterTableChipSC
      clickable
      size="large"
      severity={severity}
      icon={
        severity === 'success' ? (
          <CheckRoundedIcon />
        ) : severity === 'warning' ? (
          <WarningIcon />
        ) : (
          <ErrorIcon />
        )
      }
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {chipLabel}
    </ClusterTableChipSC>
  )
}

export function ClusterUpgradeChip({
  cluster,
}: {
  cluster?: Nullable<ClusterTinyFragment>
}) {
  const { chipLabel, severity } = getClusterUpgradeInfo(cluster)

  return (
    <Chip
      size="small"
      severity={severity}
    >{`Upgrades ${chipLabel}`}</Chip>
  )
}

export const getClusterUpgradeInfo = (
  cluster?: Nullable<ClusterTinyFragment>
) => {
  const numUpgradePlans = 3
  let numUpgradeBlockers = 0

  if (!cluster?.upgradePlan?.compatibilities) ++numUpgradeBlockers
  if (!cluster?.upgradePlan?.deprecations) ++numUpgradeBlockers
  if (!cluster?.upgradePlan?.incompatibilities) ++numUpgradeBlockers
  const severity: ChipSeverity =
    numUpgradeBlockers === 0
      ? 'success'
      : numUpgradeBlockers === 1
        ? 'warning'
        : numUpgradeBlockers === 2
          ? 'danger'
          : 'critical'
  return {
    numUpgradeBlockers,
    chipLabel: `${numUpgradePlans - numUpgradeBlockers}/${numUpgradePlans}`,
    severity,
  }
}
