import {
  Button,
  ClusterIcon,
  ErrorIcon,
  Modal,
  Table,
  WarningIcon,
} from '@pluralsh/design-system'
import { useCallback, useState } from 'react'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { Confirm } from 'components/utils/Confirm'
import { ProviderIcons } from 'components/utils/Provider'
import {
  ClustersRowFragment,
  useUpdateClusterMutation,
} from 'generated/graphql'

import { incPatchVersion } from '../../../utils/semver'

import { deprecationsColumns } from './deprecationsColumns'

function ClustersUpgradeNow({
  cluster,
  targetVersion,
}: {
  cluster?: ClustersRowFragment | null
  targetVersion: string
}) {
  const [mutation, { loading, error }] = useUpdateClusterMutation({
    variables: {
      id: cluster?.id ?? '',
      attributes: { version: targetVersion },
    },
    onCompleted: () => setConfirm(false),
  })
  const [confirm, setConfirm] = useState(false)
  const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
  const onClick = useCallback(
    () => (!hasDeprecations ? mutation() : setConfirm(true)),
    [hasDeprecations, mutation]
  )

  return (
    <div css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}>
      <Button
        small
        destructive={hasDeprecations}
        floating={!hasDeprecations}
        width="fit-content"
        loading={!hasDeprecations && loading}
        onClick={onClick}
      >
        Upgrade now
      </Button>
      <Confirm
        open={confirm}
        title="Confirm upgrade"
        text="This could be a destructive action. Before updating your Kubernetes version check and fix all deprecated resources."
        close={() => setConfirm(false)}
        submit={mutation}
        loading={loading}
        error={error}
        destructive
      />
    </div>
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
  columnHelperUpgrade.accessor((cluster) => cluster?.version, {
    id: 'version',
    header: 'Version',
    cell: ({ getValue }) => <div>v{getValue()}</div>,
  }),
  columnHelperUpgrade.accessor((cluster) => cluster?.version, {
    id: 'nextK8sRelease',
    header: 'Next K8s release',
    cell: ({ getValue }) => (
      <ColWithIcon icon={ProviderIcons.GENERIC}>
        {incPatchVersion(getValue())}
      </ColWithIcon>
    ),
  }),
  columnHelperUpgrade.accessor((cluster) => cluster, {
    id: 'actions',
    header: '',
    cell: ({ getValue }) => {
      const cluster = getValue()
      const targetVersion = incPatchVersion(cluster?.version)

      return (
        targetVersion && (
          <ClustersUpgradeNow
            cluster={cluster}
            targetVersion={targetVersion}
          />
        )
      )
    },
  }),
]

export default function ClusterUpgrade({
  cluster,
}: {
  cluster?: ClustersRowFragment | null | undefined
}) {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback((e?: Event) => {
    e?.preventDefault?.()
    setIsOpen(false)
  }, [])
  const onClose = useCallback(() => setIsOpen(false), [])
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
        onClick={() => setIsOpen(true)}
      >
        {hasDeprecations ? 'Deprecations' : 'Upgrade'}
      </Button>
      <Modal
        header="Upgrade Kubernetes"
        open={isOpen}
        onClose={onClose}
        portal
        size="large"
        maxWidth={1024}
        width={1024}
        actions={
          <Button
            type="button"
            secondary
            onClick={closeModal}
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
          {hasDeprecations ? (
            <>
              <div
                css={{
                  ...theme.partials.text.body1,
                  color: theme.colors['text-light'],
                }}
              >
                Before upgrading the Kubernetes version fix all deprecated
                resources listed below:
              </div>
              <Table
                data={cluster?.apiDeprecations || []}
                columns={deprecationsColumns}
                css={{
                  maxHeight: 310,
                  height: '100%',
                }}
              />
            </>
          ) : (
            <div
              css={{
                ...theme.partials.text.body1,
                color: theme.colors['text-light'],
              }}
            >
              No deprecated resources detected. Ready to update.
            </div>
          )}
          <Table
            data={[cluster]}
            columns={upgradeColumns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </div>
      </Modal>
    </>
  )
}
