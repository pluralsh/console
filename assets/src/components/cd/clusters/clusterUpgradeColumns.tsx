import { createColumnHelper } from '@tanstack/react-table'

import {
  ClusterIcon,
  Flex,
  IconFrame,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'
import { useEffect, useMemo, useState } from 'react'
import { ApolloError } from '@apollo/client'
import isEmpty from 'lodash/isEmpty'

import { coerce } from 'semver'

import {
  nextSupportedVersion,
  supportedUpgrades,
  toNiceVersion,
  toProviderSupportedVersion,
} from '../../../utils/semver'
import {
  ApiDeprecation,
  ClustersRowFragment,
  RuntimeServicesQuery,
} from '../../../generated/graphql'

import { TabularNumbers } from '../../cluster/TableElements'

import { ClusterUpgradePR } from './ClusterUpgradePR'

import { ClustersUpgradeNow } from './ClustersUpgradeNow'

const supportedVersions = (cluster: ClustersRowFragment | null) =>
  cluster?.provider?.supportedVersions?.map((vsn) => coerce(vsn)?.raw) ?? []

const columnHelperUpgrade = createColumnHelper<ClustersRowFragment>()

export const clusterUpgradeColumns = [
  columnHelperUpgrade.accessor(({ name }) => name, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => (
      <Flex
        gap="xsmall"
        alignItems="center"
      >
        <IconFrame
          type="floating"
          icon={<ClusterIcon />}
        />
        <span css={{ whiteSpace: 'nowrap' }}>{getValue()}</span>
      </Flex>
    ),
  }),
  columnHelperUpgrade.accessor((cluster) => cluster?.currentVersion, {
    id: 'version',
    header: 'Current version',
    cell: ({ getValue }) => <div>{toNiceVersion(getValue())}</div>,
  }),
  columnHelperUpgrade.accessor((cluster) => cluster, {
    id: 'actions',
    header: '',
    meta: {
      gridTemplate: 'fit-content(500px)',
    },
    cell: function Cell({ table, getValue, row: { original } }) {
      const theme = useTheme()
      const cluster = getValue()
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

      const { refetch, setError, runtimeServiceData } = table.options.meta as {
        refetch?: () => void
        setError?: (error: Nullable<ApolloError>) => void
        runtimeServiceData?: RuntimeServicesQuery
      }

      useEffect(() => {
        if (!upgrades.some((upgrade) => upgrade === targetVersion)) {
          setTargetVersion(undefined)
        }
      }, [targetVersion, upgrades])

      if (!isEmpty(cluster.prAutomations)) {
        return (
          <ClusterUpgradePR
            prs={cluster.prAutomations}
            setError={setError}
          />
        )
      }

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
              (runtimeServiceData?.cluster
                ?.apiDeprecations as ApiDeprecation[]) || []
            }
            refetch={refetch}
            setError={setError}
          />
        </div>
      )
    },
  }),
]
