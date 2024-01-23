import {
  Button,
  ClusterIcon,
  ErrorIcon,
  ListBoxItem,
  Select,
  Table,
  Tooltip,
  WarningIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import {
  ClustersRowFragment,
  useCreatePullRequestMutation,
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
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { ApolloError } from '@apollo/client'
import { coerce } from 'semver'

import { GqlError } from '../../utils/Alert'
import { TabularNumbers } from '../../cluster/TableElements'

import ModalAlt from '../ModalAlt'

import { deprecationsColumns } from './deprecationsColumns'
import RuntimeServices from './runtime/RuntimeServices'

const supportedVersions = (cluster: ClustersRowFragment | null) =>
  cluster?.provider?.supportedVersions?.map((vsn) => coerce(vsn)?.raw) ?? []

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
        window?.open(url, '_blank').focus()
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
  refetch,
  setError,
}: {
  cluster?: ClustersRowFragment | null
  targetVersion: Nullable<string>
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
  const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
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

const columnHelperUpgrade = createColumnHelper<ClustersRowFragment>()

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

      const { refetch, setError } = table.options.meta as {
        refetch?: () => void
        setError?: (error: Nullable<ApolloError>) => void
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
            refetch={refetch}
            setError={setError}
          />
        </div>
      )
    },
  }),
]

function ClusterUpgradeModal({
  open,
  onClose,
  hasDeprecations,
  cluster,
  refetch,
}: {
  open: boolean
  onClose: () => void
  hasDeprecations: boolean
  cluster: ClustersRowFragment | null | undefined
  refetch: Nullable<() => void>
}) {
  const [error, setError] = useState<Nullable<ApolloError>>(undefined)
  const theme = useTheme()

  return (
    <ModalAlt
      header="Upgrading Kubernetes"
      open={open}
      onClose={onClose}
      portal
      size="large"
      maxWidth={1024}
      width={1024}
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
          reactTableOptions={{ meta: { refetch, setError } }}
        />
        <RuntimeServices cluster={cluster} />
        {hasDeprecations && (
          <Table
            data={cluster?.apiDeprecations || []}
            columns={deprecationsColumns}
            css={{
              maxHeight: 181,
              height: '100%',
            }}
          />
        )}
        {error && (
          <GqlError
            header="Problem upgrading cluster"
            error={error}
          />
        )}
      </div>
    </ModalAlt>
  )
}

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
  const hasDeprecations = !isEmpty(cluster?.apiDeprecations)

  return (
    <>
      <Button
        small
        floating
        width="fit-content"
        startIcon={
          hasDeprecations ? (
            <ErrorIcon
              color="icon-danger"
              width={16}
            />
          ) : (
            <WarningIcon
              color="icon-warning"
              width={16}
            />
          )
        }
        onClick={() => {
          setOpen(true)
        }}
      >
        {hasDeprecations ? 'Deprecations' : 'Upgrade'}
      </Button>
      <ModalMountTransition open={open}>
        <ClusterUpgradeModal
          open={open}
          onClose={onClose}
          hasDeprecations={hasDeprecations}
          cluster={cluster}
          refetch={refetch}
        />
      </ModalMountTransition>
    </>
  )
}
