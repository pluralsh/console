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
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import CopyButton from 'components/utils/CopyButton'
import { Confirm } from 'components/utils/Confirm'
import { ProviderIcons } from 'components/utils/ProviderIcon'
import {
  ApiDeprecation,
  ClustersRowFragment,
  useUpdateClusterMutation,
} from 'generated/graphql'

import { incPatchVersion } from '../../../utils/semver'

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

const columnHelperDeprecations = createColumnHelper<ApiDeprecation>()

const deprecationsColumns = [
  columnHelperDeprecations.accessor(({ component }) => component, {
    id: 'deprecated',
    header: 'Deprecated',
    meta: { truncate: true },
    cell: ({
      row: {
        original: { component },
      },
    }) => (
      <div>
        {component?.group} {component?.kind} {component?.name}
      </div>
    ),
  }),
  columnHelperDeprecations.accessor(({ component }) => component, {
    id: 'deprecatedCopy',
    header: '',
    cell: ({
      row: {
        original: { component },
      },
    }) => (
      <CopyButton
        text={`${component?.group} ${component?.kind} ${component?.name}`}
      />
    ),
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
  columnHelperDeprecations.accessor(({ component }) => component?.service, {
    id: 'repository',
    header: 'Repository',
    cell: ({ getValue }) => {
      const service = getValue()
      const url = `${service?.repository?.url}/${service?.git?.folder}` // TODO

      return (
        <div css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}>
          <Button
            small
            floating
            width="fit-content"
            startIcon={<GitHubLogoIcon />}
            as="a"
            href={url}
            target="_blank"
            rel="noopener noreferer"
          >
            Fix now
          </Button>
        </div>
      )
    },
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
  columnHelperUpgrade.accessor((cluster) => cluster?.version, {
    id: 'version',
    header: 'Version',
    cell: ({ getValue }) => <div>v{getValue()}</div>,
  }),
  columnHelperUpgrade.accessor((cluster) => cluster?.version, {
    id: 'targetVersion',
    header: 'Target version',
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
        kind: 'Ingress',
        group: 'networking.k8s/io/v1',
        synced: false,
        name: 'test',
      },
      replacement: 'networking.k8s/io/v2 Ingress <name>',
    },
    {
      component: {
        id: '',
        kind: 'Ingress',
        group: 'networking.k8s/io/v1',
        synced: false,
        name: 'test',
      },
      replacement: 'networking.k8s/io/v2 Ingress <name>',
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
