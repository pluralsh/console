import {
  Button,
  FillLevelProvider,
  Flex,
  Flyover,
} from '@pluralsh/design-system'
import {
  ClustersRowFragment,
  useClusterOverviewDetailsQuery,
} from 'generated/graphql'

import semver from 'semver'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { ButtonGroup } from 'components/utils/ButtonGroup.tsx'
import { DistroProviderIconFrame } from 'components/utils/ClusterDistro.tsx'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getClusterDetailsPath } from 'routes/cdRoutesConsts.tsx'
import { getKubernetesAbsPath } from 'routes/kubernetesRoutesConsts.tsx'
import { getClusterKubeVersion } from '../runtime/RuntimeServices.tsx'
import { HealthScoreTab } from './health/HealthScoreTab.tsx'
import { OverviewTab } from './overview/OverviewTab.tsx'

const MIN_WIDTH = 920

export enum ClusterInfoFlyoverTab {
  Overview = 'Overview',
  HealthScore = 'Health score',
}

export function ClusterInfoFlyover({
  open,
  onClose,
  cluster,
  initialTab,
}: {
  open: boolean
  onClose: () => void
  cluster: Nullable<ClustersRowFragment>
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
              tertiary
              as={Link}
              to={getKubernetesAbsPath(cluster?.id ?? '')}
            >
              View in K8s Dashboard
            </Button>
            <Button
              small
              tertiary
              as={Link}
              to={getClusterDetailsPath({ clusterId: cluster?.id })}
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
      />
    </Flyover>
  )
}

function ClusterInfoFlyoverContent({
  initialTab,
  clusterBasic,
}: {
  initialTab: ClusterInfoFlyoverTab
  clusterBasic: Nullable<ClustersRowFragment>
}) {
  const [tab, setTab] = useState(initialTab)

  const kubeVersion = getClusterKubeVersion(clusterBasic)
  const parsedKubeVersion =
    semver.coerce(kubeVersion) ?? semver.coerce('1.21.0')
  const nextKubeVersion = `${parsedKubeVersion.major}.${parsedKubeVersion.minor + 1}`

  const { data, loading, error } = useClusterOverviewDetailsQuery({
    variables: {
      kubeVersion,
      nextKubeVersion,
      hasKubeVersion: true,
      id: clusterBasic?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const cluster = data?.cluster

  if (!cluster) return loading ? <LoadingIndicator /> : null
  if (error) return <GqlError error={error} />

  return (
    <FillLevelProvider value={0}>
      <Flex
        direction="column"
        gap="large"
        minWidth={MIN_WIDTH - 64}
        height="100%"
      >
        <ButtonGroup
          directory={Object.values(ClusterInfoFlyoverTab).map((value) => ({
            path: value,
            label: value,
          }))}
          tab={tab}
          onClick={(path) => setTab(path as ClusterInfoFlyoverTab)}
        />
        {tab === ClusterInfoFlyoverTab.Overview && (
          <OverviewTab
            cluster={cluster}
            setTab={setTab}
          />
        )}
        {tab === ClusterInfoFlyoverTab.HealthScore && (
          <HealthScoreTab cluster={cluster} />
        )}
      </Flex>
    </FillLevelProvider>
  )
}
