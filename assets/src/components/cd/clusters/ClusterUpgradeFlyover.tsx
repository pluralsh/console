import {
  Accordion,
  AppIcon,
  Button,
  ClusterIcon,
  Flyover,
  ListBoxItem,
  MarketPlusIcon,
  Select,
  SuccessIcon,
  Table,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'
import {
  ApiDeprecation,
  ClustersRowFragment,
  RuntimeServicesQuery,
  useCreatePullRequestMutation,
  useRuntimeServicesQuery,
  useUpdateClusterMutation,
} from 'generated/graphql'
import {
  isUpgrading,
  nextSupportedVersion,
  supportedUpgrades,
  toNiceVersion,
  toProviderSupportedVersion,
} from 'utils/semver'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { Confirm } from 'components/utils/Confirm'
import { ApolloError } from '@apollo/client'
import { coerce } from 'semver'

import { createColumnHelper } from '@tanstack/react-table'

import { IconProps } from '@pluralsh/design-system/dist/components/icons/createIcon'

import { GqlError } from '../../utils/Alert'
import { TabularNumbers } from '../../cluster/TableElements'

import RuntimeServices, {
  getClusterKubeVersion,
} from './runtime/RuntimeServices'
import { deprecationsColumns } from './deprecationsColumns'

const supportedVersions = (cluster: ClustersRowFragment | null) =>
  cluster?.provider?.supportedVersions?.map((vsn) => coerce(vsn)?.raw) ?? []

const columnHelperUpgrade = createColumnHelper<ClustersRowFragment>()

function ClusterUpgradePr({ prs, setError }) {
  const pr = prs[0]
  const [mutation, { loading, error }] = useCreatePullRequestMutation({
    variables: {
      id: pr.id,
      branch: 'mjg/upgrade',
      context: JSON.stringify({ version: '1.28' }),
    },
    onCompleted: (data) => {
      const url = data.createPullRequest?.url

      if (url) {
        window.open(url, '_blank')?.focus()
      }
    },
  })

  useEffect(() => {
    setError(error)
  }, [error, setError])

  return (
    <Button
      type="button"
      secondary
      onClick={mutation}
      loading={loading}
    >
      Upgrade Now
    </Button>
  )
}

function ClustersUpgradeNow({
  cluster,
  targetVersion,
  apiDeprecations,
  refetch,
  setError,
}: {
  cluster?: ClustersRowFragment | null
  targetVersion: Nullable<string>
  apiDeprecations: ApiDeprecation[]
  refetch: Nullable<() => void>
  setError: Nullable<(error: Nullable<ApolloError>) => void>
}) {
  const [updateCluster, { loading, error }] = useUpdateClusterMutation({
    variables: {
      id: cluster?.id ?? '',
      attributes: {
        version: toProviderSupportedVersion(
          targetVersion,
          cluster?.provider?.cloud
        ),
      },
    },
    onCompleted: () => {
      refetch?.()
      setError?.(undefined)
      setConfirm(false)
    },
    onError: (e: ApolloError) => setError?.(e),
  })
  const [confirm, setConfirm] = useState(false)
  const hasDeprecations = !isEmpty(apiDeprecations)
  const onClick = useCallback(
    () => (!hasDeprecations ? updateCluster() : setConfirm(true)),
    [hasDeprecations, updateCluster]
  )
  const upgrading =
    !cluster?.self && isUpgrading(cluster?.version, cluster?.currentVersion)

  const tooltip = upgrading
    ? 'Cluster is already upgrading'
    : cluster?.deletedAt
    ? 'Cluster is being deleted'
    : null

  return (
    <>
      <WrapWithIf
        condition={upgrading || !!cluster?.deletedAt}
        wrapper={<Tooltip label={tooltip} />}
      >
        <div>
          <Button
            small
            disabled={!targetVersion || upgrading || !!cluster?.deletedAt}
            destructive={hasDeprecations}
            floating={!hasDeprecations}
            width="fit-content"
            loading={!hasDeprecations && loading}
            onClick={onClick}
          >
            Upgrade now
          </Button>
        </div>
      </WrapWithIf>
      <Confirm
        open={confirm}
        title="Confirm upgrade"
        text="This could be a destructive action. Before updating your Kubernetes version check and fix all deprecated resources."
        close={() => setConfirm(false)}
        submit={updateCluster}
        loading={loading}
        error={error}
        destructive
      />
    </>
  )
}

const upgradeColumns = [
  columnHelperUpgrade.accessor(({ name }) => name, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => (
      <ColWithIcon icon={<ClusterIcon width={16} />}>
        <div css={{ whiteSpace: 'nowrap' }}>{getValue()}</div>
      </ColWithIcon>
    ),
  }),
  columnHelperUpgrade.accessor((cluster) => cluster?.currentVersion, {
    id: 'version',
    header: 'Current version',
    cell: ({ getValue }) => <div>{toNiceVersion(getValue())}</div>,
  }),
  columnHelperUpgrade.accessor((cluster) => cluster, {
    id: 'actions',
    header: 'Upgrade version',
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
          <ClusterUpgradePr
            prs={cluster.prAutomations}
            setError={setError}
          />
        )
      }

      if (isEmpty(upgrades) || original.self) {
        return <div>Cluster must be upgraded externally</div>
      }

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

export function ClusterUpgradeFlyover({
  open,
  onClose,
  cluster,
  refetch,
}: {
  open: boolean
  onClose: () => void
  cluster: ClustersRowFragment | null | undefined
  refetch: Nullable<() => void>
}) {
  const [error, setError] = useState<Nullable<ApolloError>>(undefined)
  const theme = useTheme()

  const POLL_INTERVAL = 10 * 1000
  const kubeVersion = getClusterKubeVersion(cluster)
  const { data: runtimeServiceData } = useRuntimeServicesQuery({
    variables: {
      kubeVersion,
      hasKubeVersion: true,
      id: cluster?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  return (
    <Flyover
      header={`Upgrade Plan for ${cluster?.name}`}
      open={open}
      onClose={onClose}
      portal
      size="large"
      minWidth={920}
      actions={
        <Button
          type="button"
          secondary
          onClick={(e) => {
            e.preventDefault()
            onClose()
          }}
        >
          Cancel
        </Button>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <Table
          data={[cluster]}
          columns={upgradeColumns}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
          reactTableOptions={{
            meta: { refetch, setError, runtimeServiceData },
          }}
        />
        <Accordion
          label={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.deprecations || false}
              icon={ClusterIcon}
              title="Check API Deprecations"
              subtitle="Ensure that all k8s yaml you're deploying is conformant with the next k8s version"
            />
          }
        >
          <Table
            data={runtimeServiceData?.cluster?.apiDeprecations || []}
            columns={deprecationsColumns}
            css={{
              maxHeight: 181,
              height: '100%',
            }}
          />
        </Accordion>
        <Accordion
          label={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.compatibilities || false}
              icon={MarketPlusIcon}
              title="Check Add-On Compatibilities"
              subtitle="Ensure all known third-party add-ons are supported on the next k8s version"
            />
          }
        >
          <RuntimeServices data={runtimeServiceData} />
        </Accordion>
        <Accordion
          label={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.incompatibilities || false}
              icon={MarketPlusIcon}
              title="Check Add-On Mutual Incompatibilities"
              subtitle="Use suggested version for each add-on to resolve mutual incompabilities"
            />
          }
        />
        {error && (
          <GqlError
            header="Problem upgrading cluster"
            error={error}
          />
        )}
      </div>
    </Flyover>
  )
}

function ClusterUpgradeAccordionTrigger({
  icon: Icon,
  title,
  subtitle,
  checked,
}: {
  icon: React.ComponentType<IconProps>
  title: string
  subtitle?: string
  checked: boolean
}) {
  return (
    <TriggerWrapperSC>
      <AppIcon
        spacing="padding"
        size="xxsmall"
        icon={
          checked ? (
            <SuccessIcon
              width={16}
              color="icon-success"
            />
          ) : (
            <Icon width={16} />
          )
        }
      />
      <div
        style={{ display: 'flex', flexDirection: 'column', lineHeight: '24px' }}
      >
        <h4 style={{ fontWeight: '500' }}>{title}</h4>
        <h5 style={{ fontWeight: '400' }}>{subtitle}</h5>
      </div>
    </TriggerWrapperSC>
  )
}

const TriggerWrapperSC = styled.div(({ theme }) => ({
  padding: theme.spacing.large - 16,
  gap: theme.spacing.large,
  cursor: 'pointer',
  fontSize: '18px',
  display: 'flex',
  alignItems: 'center',
}))
