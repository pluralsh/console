import {
  CheckRoundedIcon,
  Chip,
  ChipProps,
  ChipSeverity,
  ErrorIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { ClusterTinyFragment, ClustersRowFragment } from 'generated/graphql'

export function ClusterUpgradeButton({
  cluster,
  onClick,
  ...props
}: {
  cluster?: Nullable<ClustersRowFragment>
  onClick: () => void
} & ChipProps) {
  const { chipLabel, severity } = getClusterUpgradeInfo(cluster)

  return (
    <Chip
      clickable
      size="small"
      severity={severity}
      css={{ alignSelf: 'center' }}
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
      {...props}
    >
      {chipLabel}
    </Chip>
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
