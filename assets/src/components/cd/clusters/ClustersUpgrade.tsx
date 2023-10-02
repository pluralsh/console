import {
  Accordion,
  Button,
  ClusterIcon,
  ErrorIcon,
  GitHubIcon,
  GitHubLogoIcon,
  Modal,
  ReloadIcon,
  Table,
  WarningIcon,
} from '@pluralsh/design-system'
import { useCallback, useState } from 'react'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import { ApiDeprecation, Cluster } from '../../../generated/graphql'
import { ColWithIcon } from '../repos/GitRepositories'

const columnHelperDeprecations = createColumnHelper<ApiDeprecation>()

const deprecationsColumns = [
  columnHelperDeprecations.accessor(({ component }) => component, {
    id: 'deprecated',
    header: 'Deprecated',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ replacement }) => replacement, {
    id: 'fix',
    header: 'Fix',
    cell: ({ getValue }) => <div>v{getValue()}</div>,
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

const columnHelperUpgrade = createColumnHelper<Cluster>()

const upgradeColumns = [
  columnHelperUpgrade.accessor((cluster) => cluster?.name, {
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
    cell: () => <div>TODO</div>,
  }),
  columnHelperUpgrade.accessor(() => undefined, {
    id: 'actions',
    header: '',
    cell: () => (
      <div css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}>
        <Button
          small
          destructive
          width="fit-content"
        >
          Upgrade now
        </Button>
      </div>
    ),
  }),
]

export default function ClustersUpgrade({
  cluster,
}: {
  cluster?: Cluster | null
}) {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback(() => setIsOpen(false), [])
  const onClose = useCallback(() => setIsOpen(false), [])
  const hasDeprecations = true // TODO: !isEmpty(cluster?.apiDeprecations)

  const apiDeprecations: ApiDeprecation[] = [
    {
      component: 'networking.k8s/io/v1 Ingress <name>',
      replacement: 'networking.k8s/io/v1 Ingress <name>',
    },
    {
      component: 'networking.k8s/io/v1 Ingress <name>',
      replacement: 'networking.k8s/io/v1 Ingress <name>',
    },
    {
      component: 'networking.k8s/io/v1 Ingress <name>',
      replacement: 'networking.k8s/io/v1 Ingress <name>',
    },
  ] // TODO: Remove

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
              <div
                css={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.small,
                }}
              >
                <Table
                  data={apiDeprecations}
                  columns={deprecationsColumns}
                  css={{
                    maxHeight: 'unset',
                    height: '100%',
                  }}
                />
                <div css={{ display: 'flex', justifyContent: 'end' }}>
                  <Button
                    startIcon={<ReloadIcon />}
                    small
                    floating
                    width="fit-content"
                  >
                    Refresh scan
                  </Button>
                </div>
              </div>
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
