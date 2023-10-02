import {
  Accordion,
  Button,
  ClusterIcon,
  ErrorIcon,
  GitHubLogoIcon,
  Modal,
  Table,
  WarningIcon,
} from '@pluralsh/design-system'
import { useCallback, useState } from 'react'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import isEmpty from 'lodash/isEmpty'

import { ApiDeprecation, ClustersRowFragment } from '../../../generated/graphql'
import { ColWithIcon } from '../repos/GitRepositories'
import CopyButton from '../../utils/CopyButton'
import { ProviderIcons } from '../../utils/ProviderIcon'
import { Confirm } from '../../utils/Confirm'

function ClustersUpgradeNow({
  cluster,
}: {
  cluster?: ClustersRowFragment | null
}) {
  const [confirm, setConfirm] = useState(false)
  const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
  const upgrade = useCallback(() => console.log('TODO'), [])
  const onClick = useCallback(
    () => (!hasDeprecations ? upgrade() : setConfirm(true)),
    [hasDeprecations, upgrade]
  )

  return (
    <div css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}>
      <Button
        small
        destructive={hasDeprecations}
        floating={!hasDeprecations}
        width="fit-content"
        onClick={onClick}
      >
        Upgrade now
      </Button>
      <Confirm
        open={confirm}
        title="Confirm upgrade"
        text="This could be a destructive action. Before updating your Kubernetes version check and fix all deprecated resources."
        close={() => setConfirm(false)}
        submit={upgrade}
        loading={false}
        destructive
      />
    </div>
  )
}

const columnHelperDeprecations = createColumnHelper<ApiDeprecation>()

const deprecationsColumns = [
  columnHelperDeprecations.accessor(({ component }) => component?.name, {
    id: 'deprecated',
    header: 'Deprecated',
    meta: { truncate: true },
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ component }) => component?.name, {
    id: 'deprecatedCopy',
    header: '',
    cell: ({ getValue }) => <CopyButton text={getValue()} />,
  }),
  columnHelperDeprecations.accessor(({ replacement }) => replacement, {
    id: 'fix',
    header: 'Fix',
    meta: { truncate: true },
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ replacement }) => replacement, {
    id: 'fixCopy',
    header: '',
    cell: ({ getValue }) => <CopyButton text={getValue()} />,
  }),
  columnHelperDeprecations.accessor(() => undefined, {
    id: 'repository',
    header: 'Repository',
    cell: () => (
      <div css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}>
        <Button
          small
          floating
          width="fit-content"
          startIcon={<GitHubLogoIcon />}
        >
          Fix now
        </Button>
      </div>
    ),
  }),
]

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
    header: 'Version',
    cell: ({ getValue }) => <div>v{getValue()}</div>,
  }),
  columnHelperUpgrade.accessor((cluster) => cluster?.currentVersion, {
    id: 'targetVersion',
    header: 'Target version',
    cell: () => <ColWithIcon icon={ProviderIcons.GENERIC}>TODO</ColWithIcon>,
  }),
  columnHelperUpgrade.accessor((cluster) => cluster, {
    id: 'actions',
    header: '',
    cell: ({ getValue }) => <ClustersUpgradeNow cluster={getValue()} />,
  }),
]

export default function ClustersUpgrade({
  cluster,
}: {
  cluster?: ClustersRowFragment | null
}) {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback(() => setIsOpen(false), [])
  const onClose = useCallback(() => setIsOpen(false), [])

  const apiDeprecations: ApiDeprecation[] = [
    {
      component: {
        id: '',
        kind: '',
        synced: false,
        name: 'networking.k8s/io/v1 Ingress <name>',
      },
      replacement: 'networking.k8s/io/v1 Ingress <name>',
    },
    {
      component: {
        id: '',
        kind: '',
        synced: false,
        name: 'networking.k8s/io/v1 Ingress <name>',
      },
      replacement: 'networking.k8s/io/v1 Ingress <name>',
    },
  ] // TODO: Remove

  const hasDeprecations = !isEmpty(apiDeprecations)

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
            primary
            onClick={closeModal}
          >
            Close
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
                data={apiDeprecations}
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
          <Accordion label="Helpful resources">TODO</Accordion>
        </div>
      </Modal>
    </>
  )
}
