import {
  Button,
  Chip,
  ErrorIcon,
  InfoIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { useCallback, useState } from 'react'
import { ClusterTinyFragment, ClustersRowFragment } from 'generated/graphql'

import { ClusterUpgradeFlyover } from './ClusterUpgradeFlyover'

export default function ClusterUpgrade({
  cluster,
  refetch,
}: {
  cluster?: ClustersRowFragment | null | undefined
  refetch: Nullable<() => void>
}) {
  const [open, setOpen] = useState(false)
  const onClose = useCallback((e?: Event) => {
    e?.preventDefault?.()
    setOpen(false)
  }, [])
  const numUpgradePlans = 3
  let numUpgrades = numUpgradePlans

  if (!cluster?.upgradePlan?.compatibilities) --numUpgrades
  if (!cluster?.upgradePlan?.deprecations) --numUpgrades
  if (!cluster?.upgradePlan?.incompatibilities) --numUpgrades

  return (
    <>
      <Button
        small
        secondary
        minWidth="fit-content"
        startIcon={
          numUpgrades < 2 ? (
            <ErrorIcon
              color="icon-danger"
              width={16}
            />
          ) : numUpgrades === 2 ? (
            <WarningIcon
              color="icon-warning"
              width={16}
            />
          ) : (
            <InfoIcon
              color="icon-info"
              width={16}
            />
          )
        }
        onClick={() => {
          setOpen(true)
        }}
      >
        {`Upgrade ${numUpgrades}/${numUpgradePlans}`}
      </Button>
      <ClusterUpgradeFlyover
        open={open}
        onClose={onClose}
        cluster={cluster}
        refetch={refetch}
      />
    </>
  )
}

export function ClusterUpgradeChip({
  cluster,
}: {
  cluster?: ClusterTinyFragment | null | undefined
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
