import {
  CheckRoundedIcon,
  Chip,
  ErrorIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { ClusterTinyFragment, ClustersRowFragment } from 'generated/graphql'
import { ClusterTableChipSC } from './ClusterHealthChip'

export function ClusterUpgradeButton({
  cluster,
  onClick,
}: {
  cluster?: ClustersRowFragment | null | undefined
  onClick: () => void
}) {
  const numUpgradePlans = 3
  let numUpgradeBlockers = 0

  if (!cluster?.upgradePlan?.compatibilities) ++numUpgradeBlockers
  if (!cluster?.upgradePlan?.deprecations) ++numUpgradeBlockers
  if (!cluster?.upgradePlan?.incompatibilities) ++numUpgradeBlockers
  const severity =
    numUpgradeBlockers === 0
      ? 'success'
      : numUpgradeBlockers === 1
        ? 'warning'
        : numUpgradeBlockers === 2
          ? 'danger'
          : 'critical'
  return (
    <ClusterTableChipSC
      clickable
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
      {`${numUpgradePlans - numUpgradeBlockers}/${numUpgradePlans}`}
    </ClusterTableChipSC>
  )
}

export function ClusterUpgradeChip({
  cluster,
}: {
  cluster?: Nullable<ClusterTinyFragment>
}) {
  const numUpgradePlans = 3
  let numUpgrades = numUpgradePlans

  if (!cluster?.upgradePlan?.compatibilities) --numUpgrades
  if (!cluster?.upgradePlan?.deprecations) --numUpgrades
  if (!cluster?.upgradePlan?.incompatibilities) --numUpgrades

  return (
    <Chip
      size="small"
      severity={
        numUpgrades < 2 ? 'danger' : numUpgrades === 2 ? 'warning' : 'neutral'
      }
    >{`Upgrades ${numUpgrades}/${numUpgradePlans}`}</Chip>
  )
}
