import { ApolloError } from '@apollo/client'
import {
  Accordion,
  AccordionItem,
  AppIcon,
  Button,
  ChecklistIcon,
  ClusterIcon,
  ConfettiIcon,
  Flex,
  Flyover,
  IconFrame,
  ListBoxItem,
  Select,
  SuccessIcon,
  Table,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { Confirm } from 'components/utils/Confirm'
import {
  ApiDeprecation,
  ClustersRowFragment,
  RuntimeServicesQuery,
  useCreatePullRequestMutation,
  useRuntimeServicesQuery,
  useUpdateClusterMutation,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { coerce } from 'semver'
import styled, { useTheme } from 'styled-components'
import {
  isUpgrading,
  nextSupportedVersion,
  supportedUpgrades,
  toNiceVersion,
  toProviderSupportedVersion,
} from 'utils/semver'

import { createColumnHelper } from '@tanstack/react-table'

import { IconProps } from '@pluralsh/design-system/dist/components/icons/createIcon'

import { TabularNumbers } from '../../cluster/TableElements'
import { GqlError } from '../../utils/Alert'

import { deprecationsColumns } from './deprecationsColumns'
import RuntimeServices, {
  getClusterKubeVersion,
} from './runtime/RuntimeServices'

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
          <ClusterUpgradePr
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

const POLL_INTERVAL = 10 * 1000

function FlyoverContent({ open, cluster, refetch }) {
  const [upgradeError, setError] = useState<Nullable<ApolloError>>(undefined)
  const theme = useTheme()

  const kubeVersion = getClusterKubeVersion(cluster)
  const { data, error } = useRuntimeServicesQuery({
    variables: {
      kubeVersion,
      hasKubeVersion: true,
      id: cluster?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !open,
  })

  const runtimeServices = data?.cluster?.runtimeServices
  const apiDeprecations = data?.cluster?.apiDeprecations

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      {(upgradeError || error) && (
        <GqlError
          header={
            upgradeError
              ? 'Could not upgrade cluster'
              : 'Failed to fetch upgrade plan'
          }
          error={upgradeError || error}
        />
      )}
      <Table
        data={[cluster]}
        columns={upgradeColumns}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
        reactTableOptions={{
          meta: { refetch, setError, data },
        }}
      />
      <Accordion
        type="single"
        fillLevel={1}
      >
        <AccordionItem
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.deprecations || false}
              icon={ChecklistIcon}
              title="Check API deprecations"
              subtitle="Ensure that all K8s YAML you're deploying is conformant with the next K8s version"
            />
          }
        >
          {!isEmpty(apiDeprecations) ? (
            <Table
              flush
              data={apiDeprecations || []}
              columns={deprecationsColumns}
              css={{
                maxHeight: 181,
                height: '100%',
              }}
            />
          ) : (
            <EmptyState description="No services with api deprecations discovered!" />
          )}
        </AccordionItem>
      </Accordion>
      <Accordion
        type="single"
        fillLevel={1}
      >
        <AccordionItem
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.compatibilities || false}
              icon={ChecklistIcon}
              title="Check add-on compatibilities"
              subtitle="Ensure all known third-party add-ons are supported on the next K8s version"
            />
          }
        >
          {!isEmpty(runtimeServices) ? (
            <RuntimeServices
              flush
              data={data}
            />
          ) : (
            <EmptyState description="No known add-ons found" />
          )}
        </AccordionItem>
      </Accordion>
      <Accordion
        type="single"
        fillLevel={1}
      >
        <AccordionItem
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.incompatibilities || false}
              icon={ChecklistIcon}
              title="Check add-on mutual incompatibilities"
              subtitle="Use suggested version for each add-on to resolve mutual incompatibilities"
            />
          }
        >
          <EmptyState description="No mutually incompatible add-ons detected!" />
        </AccordionItem>
      </Accordion>
    </div>
  )
}

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
  return (
    <Flyover
      header={`Upgrade Plan for ${cluster?.name}`}
      open={open}
      onClose={onClose}
      minWidth={920}
    >
      <FlyoverContent
        open={open}
        cluster={cluster}
        refetch={refetch}
      />
    </Flyover>
  )
}

function EmptyState({ description }) {
  const theme = useTheme()

  return (
    <div
      css={{
        padding: theme.spacing.medium,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.small,
      }}
    >
      <ConfettiIcon
        size={32}
        color={theme.colors['icon-success']}
      />
      <span>{description}</span>
    </div>
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
  const theme = useTheme()

  return (
    <TriggerWrapperSC>
      <AppIcon
        spacing="padding"
        size="xxsmall"
        icon={
          checked ? (
            <SuccessIcon color="icon-success" />
          ) : (
            <Icon color="icon-warning" />
          )
        }
      />
      <div css={{ display: 'flex', flexDirection: 'column' }}>
        <span css={theme.partials.text.body1Bold}>{title}</span>
        <span
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-light'],
          }}
        >
          {subtitle}
        </span>
      </div>
    </TriggerWrapperSC>
  )
}

const TriggerWrapperSC = styled.div(({ theme }) => ({
  padding: theme.spacing.xsmall,
  gap: theme.spacing.large,
  cursor: 'pointer',
  fontSize: '18px',
  display: 'flex',
  alignItems: 'center',
}))
