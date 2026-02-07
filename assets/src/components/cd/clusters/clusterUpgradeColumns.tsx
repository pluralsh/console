import { createColumnHelper } from '@tanstack/react-table'

import { CheckIcon, Chip, ListBoxItem, Select } from '@pluralsh/design-system'

import { ApolloError } from '@apollo/client'
import isEmpty from 'lodash/isEmpty'
import {
  Dispatch,
  SetStateAction,
  use,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTheme } from 'styled-components'

import { coerce } from 'semver'

import {
  ApiDeprecation,
  ClusterOverviewDetailsFragment,
  ClusterUpgradePlanFragment,
} from '../../../generated/graphql'
import {
  nextSupportedVersion,
  supportedUpgrades,
  toNiceVersion,
  toProviderSupportedVersion,
} from '../../../utils/semver'

import { TabularNumbers } from '../../cluster/TableElements'

import { ClusterUpgradePR } from './ClusterUpgradePR'

import { useLatestK8sVsn } from 'components/contexts/DeploymentSettingsContext'
import { FeatureFlagContext } from 'components/flows/FeatureFlagContext'
import { StackedText } from 'components/utils/table/StackedText'
import { ClustersUpgradeNow } from './ClustersUpgradeNow'
import { ClusterUpgradeAgentButton } from './ClusterUpgradeAgentButton'

type PreFlightChecklistItem = {
  key: keyof ClusterUpgradePlanFragment
  name: string
  description: string
  value?: boolean // this is set after fetching the upgrade plan data
}

const supportedVersions = (cluster: ClusterOverviewDetailsFragment | null) =>
  cluster?.provider?.supportedVersions?.map((vsn) => coerce(vsn)?.raw) ?? []

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
    id: 'actions',
    header: '',
    meta: { gridTemplate: 'fit-content(500px)' },
    cell: function Cell({ table, getValue, row: { original } }) {
      const theme = useTheme()
      const cluster = getValue()
      const latestK8sVsn = useLatestK8sVsn()
      const agentEnabled = use(FeatureFlagContext).featureFlags.Agent

      const upgrades = useMemo(
        () => supportedUpgrades(cluster.version, supportedVersions(cluster)),
        [cluster]
      )
      const upgradeVersion = nextSupportedVersion(
        cluster?.version,
        cluster?.provider?.supportedVersions
      )
      const [targetVersion, setTargetVersion] =
        useState<Nullable<string>>(upgradeVersion)

      const { refetch, setError } = table.options.meta as {
        refetch?: () => void
        setError?: Dispatch<SetStateAction<Nullable<ApolloError>>>
      }

      useEffect(() => {
        if (!upgrades.some((upgrade) => upgrade === targetVersion))
          setTargetVersion(undefined)
      }, [targetVersion, upgrades])

      if (!!cluster.prAutomations && cluster.prAutomations.length > 0)
        return (
          <ClusterUpgradePR
            prs={cluster.prAutomations}
            setError={setError}
          />
        )
      if (latestK8sVsn && cluster.version !== latestK8sVsn && agentEnabled)
        return <ClusterUpgradeAgentButton cluster={cluster} />

      if (isEmpty(upgrades) || original.self) return null

      return (
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.medium,
            alignItems: 'center',
          }}
        >
          <div css={{ minWidth: 170 }}>
            <Select
              size="small"
              label="Select version"
              selectedKey={targetVersion}
              onSelectionChange={setTargetVersion as any}
            >
              {upgrades.map((v) => (
                <ListBoxItem
                  key={v}
                  label={
                    <TabularNumbers css={{ textAlign: 'right' }}>
                      {toNiceVersion(
                        toProviderSupportedVersion(v, cluster?.provider?.cloud)
                      )}
                    </TabularNumbers>
                  }
                />
              ))}
            </Select>
          </div>
          <ClustersUpgradeNow
            cluster={cluster}
            targetVersion={targetVersion}
            apiDeprecations={
              (cluster?.apiDeprecations as ApiDeprecation[]) || []
            }
            refetch={refetch}
            setError={setError}
          />
        </div>
      )
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
