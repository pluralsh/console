import { ComponentProps, ReactElement, useState } from 'react'
import {
  Button,
  ClusterIcon,
  DeploymentIcon,
  IconFrame,
  ListBoxItem,
  PeopleIcon,
  PipelineIcon,
  PrOpenIcon,
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
import { TruncateStart } from 'components/utils/table/Truncate'
import { MoreMenu } from 'components/utils/MoreMenu'
import { StackedText } from 'components/utils/table/StackedText'
import { BasicLink } from 'components/utils/typography/BasicLink'
import { Link } from 'react-router-dom'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { PrAutomationPermissionsModal } from 'components/pr/automations/PrAutomationPermissionsModal'

import { CreatePrModal } from './CreatePrModal'

enum MenuItemKey {
  Permissions = 'permissions',
  Delete = 'delete',
  CreatePr = 'create-pr',
}

export const columnHelper = createColumnHelper<Edge<PrAutomationFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Automation name',
  cell: ({ getValue }) => getValue(),
})

const ColDocumentation = columnHelper.accessor(
  ({ node }) => node?.documentation,
  {
    id: 'documentation',
    header: 'Documentation',
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }
)

const ColRepo = columnHelper.accessor(({ node }) => node?.identifier, {
  id: 'repoUrl',
  header: 'Repo',
  meta: { truncate: true },
  cell: ({ getValue }) => <TruncateStart>{getValue()}</TruncateStart>,
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
    const label = roleToLabel[role || ''] || roleToLabel['']

    if (!role) return null

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
        css={{
          alignItems: 'center',
          alignSelf: 'end',
          display: 'flex',
          columnGap: theme.spacing.medium,
        }}
      >
        <Button
          secondary
          startIcon={<PrOpenIcon />}
          onClick={() => {
            setMenuKey(MenuItemKey.CreatePr)
          }}
        >
          Create a PR
        </Button>
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
        <AutomationPermissionsModal
          prAutomation={prAutomation}
          open={menuKey === MenuItemKey.Permissions}
          onClose={() => setMenuKey('')}
        />
        <CreatePrModal
          prAutomation={prAutomation}
          open={menuKey === MenuItemKey.CreatePr}
          onClose={() => setMenuKey('')}
        />
      </div>
    )
  },
})

function AutomationPermissionsModal(
  props: ComponentProps<typeof PrAutomationPermissionsModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <PrAutomationPermissionsModal {...props} />
    </ModalMountTransition>
  )
}

export const columns = [ColName, ColRole, ColDocumentation, ColRepo, ColActions]
