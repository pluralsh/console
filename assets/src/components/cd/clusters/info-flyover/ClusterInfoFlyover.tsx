import { Flex, Flyover } from '@pluralsh/design-system'
import { ClustersRowFragment } from 'generated/graphql'

import { getClusterKubeVersion } from '../runtime/RuntimeServices.tsx'
import { UpgradesTab } from './UpgradesTab.tsx'
import { useState } from 'react'
import ButtonGroup from 'components/utils/ButtonGroup.tsx'

export enum ClusterInfoFlyoverTab {
  Overview = 'Overview',
  HealthScore = 'Health score',
  Upgrades = 'Upgrades',
}

export function ClusterInfoFlyover({
  open,
  onClose,
  cluster,
  refetch,
  initialTab,
}: {
  open: boolean
  onClose: () => void
  cluster: Nullable<ClustersRowFragment>
  refetch: Nullable<() => void>
  initialTab: ClusterInfoFlyoverTab
}) {
  return (
    <Flyover
      header={`Upgrade Plan for ${cluster?.name}`}
      open={open}
      onClose={onClose}
      minWidth={920}
    >
      <ClusterInfoFlyoverContent
        initialTab={initialTab}
        cluster={cluster}
        refetch={refetch}
      />
    </Flyover>
  )
}

function ClusterInfoFlyoverContent({
  initialTab,
  cluster,
  refetch,
}: {
  initialTab: ClusterInfoFlyoverTab
  cluster: Nullable<ClustersRowFragment>
  refetch: Nullable<() => void>
}) {
  const [tab, setTab] = useState(initialTab)
  const kubeVersion = getClusterKubeVersion(cluster)
  if (!cluster) return null

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <ButtonGroup
        directory={Object.values(ClusterInfoFlyoverTab).map((value) => ({
          path: value,
          label: value,
        }))}
        tab={tab}
        onClick={(path) => setTab(path as ClusterInfoFlyoverTab)}
        css={{ flex: 1, justifyContent: 'center' }}
        fillLevel={0}
      />
      {tab === ClusterInfoFlyoverTab.Upgrades && (
        <UpgradesTab
          clusterId={cluster?.id ?? ''}
          kubeVersion={kubeVersion}
          refetch={refetch}
        />
      )}
    </Flex>
  )
}
