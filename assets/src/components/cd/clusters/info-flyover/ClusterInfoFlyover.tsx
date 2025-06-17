import {
  Button,
  FillLevelProvider,
  Flex,
  Flyover,
  GitPullIcon,
  KubernetesIcon,
} from '@pluralsh/design-system'
import {
  ClustersRowFragment,
  useClusterOverviewDetailsQuery,
} from 'generated/graphql'

import ButtonGroup from 'components/utils/ButtonGroup.tsx'
import { DistroProviderIconFrame } from 'components/utils/ClusterDistro.tsx'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getClusterDetailsPath } from 'routes/cdRoutesConsts.tsx'
import { getKubernetesAbsPath } from 'routes/kubernetesRoutesConsts.tsx'
import { getClusterUpgradeInfo } from '../ClusterUpgradeButton.tsx'
import { getClusterKubeVersion } from '../runtime/RuntimeServices.tsx'
import { HealthScoreTab } from './health/HealthScoreTab.tsx'
import { OverviewTab } from './overview/OverviewTab.tsx'
import { UpgradeAccordionName, UpgradesTab } from './UpgradesTab.tsx'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'

const MIN_WIDTH = 920

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
      header={
        <Flex
          width="100%"
          minWidth={MIN_WIDTH - 64}
          justify="space-between"
        >
          <Flex
            align="center"
            gap="xsmall"
          >
            <DistroProviderIconFrame
              background="fill-two"
              distro={cluster?.distro}
              provider={cluster?.provider?.cloud}
              size="medium"
              type="secondary"
            />
            {cluster?.name ?? '-'}
          </Flex>
          <Flex gap="small">
            <Button
              small
              secondary
              as={Link}
              to={getKubernetesAbsPath(cluster?.id ?? '')}
              startIcon={<KubernetesIcon />}
            >
              View in K8s Dashboard
            </Button>
            <Button
              small
              secondary
              as={Link}
              to={getClusterDetailsPath({ clusterId: cluster?.id })}
              startIcon={<GitPullIcon />}
            >
              View in CD
            </Button>
          </Flex>
        </Flex>
      }
      open={open}
      onClose={onClose}
      minWidth={MIN_WIDTH}
    >
      <ClusterInfoFlyoverContent
        initialTab={initialTab}
        clusterBasic={cluster}
        refetch={refetch}
      />
    </Flyover>
  )
}

function ClusterInfoFlyoverContent({
  initialTab,
  clusterBasic,
  refetch,
}: {
  initialTab: ClusterInfoFlyoverTab
  clusterBasic: Nullable<ClustersRowFragment>
  refetch: Nullable<() => void>
}) {
  const [tab, setTab] = useState(initialTab)
  const [upgradesInitialOpen, setUpgradesInitialOpen] =
    useState<UpgradeAccordionName>()
  const kubeVersion = getClusterKubeVersion(clusterBasic)

  const { data, loading, error } = useClusterOverviewDetailsQuery({
    variables: {
      kubeVersion,
      hasKubeVersion: true,
      id: clusterBasic?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const cluster = data?.cluster

  if (!cluster) return loading ? <LoadingIndicator /> : null
  if (error) return <GqlError error={error} />

  const { chipLabel } = getClusterUpgradeInfo(cluster)

  return (
    <FillLevelProvider value={0}>
      <Flex
        direction="column"
        gap="large"
        minWidth={MIN_WIDTH - 64}
      >
        <ButtonGroup
          directory={Object.values(ClusterInfoFlyoverTab).map((value) => ({
            path: value,
            label: `${value}${value === ClusterInfoFlyoverTab.Upgrades ? ` (${chipLabel})` : value === ClusterInfoFlyoverTab.HealthScore ? ` (${cluster?.healthScore})` : ''}`,
          }))}
          tab={tab}
          onClick={(path) => setTab(path as ClusterInfoFlyoverTab)}
          css={{ flex: 1, justifyContent: 'center' }}
        />
        {tab === ClusterInfoFlyoverTab.Overview && (
          <OverviewTab
            cluster={cluster}
            setTab={setTab}
            setUpgradesInitialOpen={setUpgradesInitialOpen}
          />
        )}
        {tab === ClusterInfoFlyoverTab.HealthScore && (
          <HealthScoreTab cluster={cluster} />
        )}
        {tab === ClusterInfoFlyoverTab.Upgrades && (
          <UpgradesTab
            cluster={cluster}
            refetch={refetch}
            initialOpen={upgradesInitialOpen}
          />
        )}
      </Flex>
    </FillLevelProvider>
  )
}
