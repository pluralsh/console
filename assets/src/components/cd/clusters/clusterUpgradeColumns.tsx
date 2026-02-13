import { createColumnHelper } from '@tanstack/react-table'

import { CheckIcon, Chip } from '@pluralsh/design-system'

import { use, useState } from 'react'

import {
  ClusterOverviewDetailsFragment,
  ClusterUpgradePlanFragment,
  KubernetesChangelogFragment,
} from '../../../generated/graphql'
import { toNiceVersion } from '../../../utils/semver'

import { useLatestK8sVsn } from 'components/contexts/DeploymentSettingsContext'
import { FeatureFlagContext } from 'components/flows/FeatureFlagContext'
import { StackedText } from 'components/utils/table/StackedText'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { KubernetesChangelogFlyover } from '../cluster/upgrade-plan/KubernetesChangelogFlyover'
import { ClusterUpgradeAgentButton } from './ClusterUpgradeAgentButton'

type PreFlightChecklistItem = {
  key: keyof ClusterUpgradePlanFragment
  name: string
  description: string
  value?: boolean // this is set after fetching the upgrade plan data
}

const columnHelperUpgrade = createColumnHelper<ClusterOverviewDetailsFragment>()
const columnHelperPreFlight = createColumnHelper<PreFlightChecklistItem>()

export const clusterUpgradeColumns = [
  columnHelperUpgrade.accessor(({ name }) => name, {
    id: 'cluster',
    cell: ({ getValue }) => (
      <StackedText
        first="Cluster"
        firstPartialType="caption"
        firstColor="text-xlight"
        second={getValue()}
        secondPartialType="body2"
        secondColor="text"
      />
    ),
  }),
  columnHelperUpgrade.accessor((cluster) => cluster?.currentVersion, {
    id: 'version',
    cell: ({ getValue }) => (
      <StackedText
        first="Current version"
        firstPartialType="caption"
        firstColor="text-xlight"
        second={toNiceVersion(getValue())}
        secondPartialType="body2"
        secondColor="text"
      />
    ),
  }),
  columnHelperUpgrade.accessor((cluster) => cluster, {
    id: 'changelog',
    cell: function Cell({ table: { options }, getValue }) {
      const cluster = getValue()
      const kubernetesChangelog = options.meta
        ?.kubernetesChangelog as Nullable<KubernetesChangelogFragment>

      const [flyoverOpen, setFlyoverOpen] = useState(false)
      if (!kubernetesChangelog) return null

      return (
        <>
          <StackedText
            first="Kubernetes changelog"
            firstPartialType="caption"
            firstColor="text-xlight"
            second={
              <InlineLink onClick={() => setFlyoverOpen(true)}>
                {toNiceVersion(kubernetesChangelog?.version)}
              </InlineLink>
            }
            secondPartialType="body2"
            secondColor="text"
          />

          <KubernetesChangelogFlyover
            open={flyoverOpen}
            onClose={() => setFlyoverOpen(false)}
            cluster={cluster}
            kubernetesChangelog={kubernetesChangelog}
          />
        </>
      )
    },
  }),
  columnHelperUpgrade.accessor((cluster) => cluster, {
    id: 'actions',
    header: '',
    cell: function Cell({ getValue }) {
      const cluster = getValue()
      const latestK8sVsn = useLatestK8sVsn()
      const agentEnabled = use(FeatureFlagContext).featureFlags.Agent

      if (cluster.version !== latestK8sVsn && agentEnabled)
        return <ClusterUpgradeAgentButton cluster={cluster} />

      return null
    },
  }),
]

export const clusterPreFlightCols = [
  columnHelperPreFlight.accessor(({ name }) => name, {
    id: 'name',
    header: 'Name',
  }),
  columnHelperPreFlight.accessor(({ description }) => description, {
    id: 'description',
    header: 'Description',
  }),
  columnHelperPreFlight.accessor(({ value }) => value, {
    id: 'check',
    header: '',
    cell: function Cell({ getValue }) {
      const value = getValue()
      return (
        <Chip
          severity={value ? 'success' : 'neutral'}
          inactive={!value}
          icon={value ? <CheckIcon /> : undefined}
        >
          {value ? 'Complete' : 'Incomplete'}
        </Chip>
      )
    },
  }),
]

export const initialClusterPreFlightItems: PreFlightChecklistItem[] = [
  {
    key: 'kubeletSkew',
    name: 'kubelet version skew',
    description:
      'Kubernetes requires only 1 minor version of drift between the kubelet and control plane.',
  },
]
