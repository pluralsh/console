import { ReactElement, useState } from 'react'
import {
  Button,
  ClusterIcon,
  DeploymentIcon,
  IconFrame,
  LinkoutIcon,
  ListBoxItem,
  PeopleIcon,
  PipelineIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import {
  PrAutomationFragment,
  PrRole,
  useDeletePrAutomationMutation,
} from 'generated/graphql'

import { Edge } from 'utils/graphql'
import { Confirm } from 'components/utils/Confirm'
import { TruncateStart } from 'components/utils/table/TruncateStart'
import { MoreMenu } from 'components/utils/MoreMenu'
import { StackedText } from 'components/utils/table/StackedText'
import { BasicLink } from 'components/utils/typography/BasicLink'
import { Link } from 'react-router-dom'

const DOCS_URL = 'https://docs.plural.sh/'

enum MenuItemKey {
  Permissions = 'permissions',
  Delete = 'delete',
}

export const columnHelper = createColumnHelper<Edge<PrAutomationFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Automation name',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const ColDocumentation = columnHelper.accessor(
  ({ node }) => node?.documentation,
  {
    id: 'documentation',
    header: 'Documentation',
    meta: { truncate: true },
    cell: function Cell({ getValue }) {
      return <>{getValue()}</>
    },
  }
)

const ColRepoUrl = columnHelper.accessor(({ node }) => node?.repository?.url, {
  id: 'repoUrl',
  header: 'Repo url',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return (
      <TruncateStart>
        <span>{getValue()}</span>
      </TruncateStart>
    )
  },
})

const ColRoleSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

const DynamicRoleIconSC = styled.div((_) => ({
  position: 'relative',
}))

const roleToLabel = {
  [PrRole.Cluster]: 'Cluster',
  [PrRole.Pipeline]: 'Pipeline',
  [PrRole.Service]: 'Service',
  [PrRole.Update]: 'Update',
  [PrRole.Upgrade]: 'Upgrade',
  '': 'Unknown',
} as const satisfies Record<PrRole | '', string>

const roleToIcon = {
  [PrRole.Cluster]: <ClusterIcon />,
  [PrRole.Pipeline]: <PipelineIcon />,
  [PrRole.Service]: <DeploymentIcon />,
  [PrRole.Update]: <ClusterIcon />,
  [PrRole.Upgrade]: <ClusterIcon />,
  '': <ClusterIcon />,
} as const satisfies Record<PrRole | '', ReactElement>

export function DynamicRoleIcon({ role }: { role: Nullable<PrRole> }) {
  const icon = roleToIcon[role || ''] || roleToIcon['']

  return (
    <DynamicRoleIconSC>
      <IconFrame
        size="medium"
        type="secondary"
        icon={icon}
      />
    </DynamicRoleIconSC>
  )
}

const ColRole = columnHelper.accessor(({ node }) => node?.cluster?.name, {
  id: 'role',
  header: 'Role',
  cell: function Cell({ row }) {
    const { role, cluster } = row.original.node || {}

    console.log('role', role, 'cluster', cluster?.name)
    const label = roleToLabel[role || ''] || roleToLabel['']

    return (
      <ColRoleSC>
        <DynamicRoleIcon role={role} />
        <StackedText
          first={label}
          second={
            <BasicLink
              as={Link}
              to={`/cd/clusters/${cluster?.id}`}
              css={{ whiteSpace: 'nowrap' }}
            >
              {cluster?.name}
            </BasicLink>
          }
        />
      </ColRoleSC>
    )
  },
})

const ColCreatePr = columnHelper.accessor(() => DOCS_URL, {
  id: 'createPr',
  header: '',
  cell: function Cell() {
    const theme = useTheme()

    return (
      <div css={{ '&&': { color: theme.colors['action-link-inline'] } }}>
        <Button
          secondary
          // startIcon={<PrOpenIcon />}
          endIcon={<LinkoutIcon />}
          as="a"
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          How to create a PR
        </Button>
      </div>
    )
  },
})

export function DeletePrAutomationModal({
  prAutomation,
  refetch,
  open,
  onClose,
}: {
  prAutomation: PrAutomationFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeletePrAutomationMutation({
    variables: { id: prAutomation.id },
    onCompleted: () => {
      onClose?.()
      refetch?.()
    },
  })

  return (
    <Confirm
      close={() => onClose?.()}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="Delete PR automation"
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{prAutomation.name}”
          </span>{' '}
          automation?
        </>
      }
    />
  )
}

export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  cell: function Cell({ table, getValue }) {
    const theme = useTheme()
    const prAutomation = getValue()
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()
    const { refetch } = table.options.meta as { refetch?: () => void }

    if (!prAutomation) {
      return null
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}
      >
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Permissions}
            leftContent={<PeopleIcon />}
            label="Permissions"
            textValue="Permissions"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete automation"
            textValue="Delete automation"
          />
        </MoreMenu>
        {/* Modals */}
        <DeletePrAutomationModal
          prAutomation={prAutomation}
          refetch={refetch}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
        {/* <AutomationPermissionsModal
          automation={automation}
          open={menuKey === MenuItemKey.Permissions}
          onClose={() => setMenuKey('')}
        /> */}
      </div>
    )
  },
})

export const columns = [
  ColName,
  ColRole,
  ColDocumentation,
  ColRepoUrl,
  ColCreatePr,
  ColActions,
]
