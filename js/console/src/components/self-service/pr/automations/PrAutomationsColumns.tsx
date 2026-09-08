import { ReactElement, useEffect, useState } from 'react'
import {
  AppIcon,
  ArrowRightIcon,
  Button,
  ClusterIcon,
  DeploymentIcon,
  Flex,
  IconFrame,
  ListBoxItem,
  PeopleIcon,
  PipelineIcon,
  PrQueueIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import {
  PrAutomationFragment,
  PrAutomationSearchItemFragment,
  PrRole,
  useDeletePrAutomationMutation,
  usePrAutomationLazyQuery,
} from 'generated/graphql'

import { Confirm } from 'components/utils/Confirm'
import { TruncateStart } from 'components/utils/table/Truncate'
import { MoreMenu } from 'components/utils/MoreMenu'
import { StackedText } from 'components/utils/table/StackedText'
import { BasicLink } from 'components/utils/typography/BasicLink'
import { Link } from 'react-router-dom'

import { CreatePrAutomation } from './CreatePrAutomation'
import { iconUrl } from 'utils/icon'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { PrAutomationPermissionsModal } from './PrAutomationPermissionsModal'
import { useSimpleToast } from 'components/utils/SimpleToastContext'

enum MenuItemKey {
  Permissions = 'permissions',
  Delete = 'delete',
  CreatePr = 'create-pr',
}

const columnHelper = createColumnHelper<
  PrAutomationFragment | PrAutomationSearchItemFragment
>()

export const ColName = columnHelper.accessor(() => null, {
  id: 'name',
  header: 'Automation name',
  cell: function Cell({
    row: {
      original: { name, icon, darkIcon },
    },
  }) {
    const theme = useTheme()

    return (
      <Flex
        alignItems={'center'}
        gap={'xsmall'}
      >
        <AppIcon
          size="xxsmall"
          url={iconUrl(icon, darkIcon, theme.mode)}
          icon={<PrQueueIcon size={16} />}
        />
        {name}
      </Flex>
    )
  },
})

export const ColDocumentation = columnHelper.accessor(
  ({ documentation }) => documentation,
  {
    id: 'documentation',
    header: 'Documentation',
    cell: ({ getValue }) => getValue(),
  }
)

export const ColRepo = columnHelper.accessor(({ identifier }) => identifier, {
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
  [PrRole.Cost]: 'Cost',
  '': 'Unknown',
} as const satisfies Record<PrRole | '', string>

const roleToIcon = {
  [PrRole.Cluster]: <ClusterIcon />,
  [PrRole.Pipeline]: <PipelineIcon />,
  [PrRole.Service]: <DeploymentIcon />,
  [PrRole.Update]: <ClusterIcon />,
  [PrRole.Upgrade]: <ClusterIcon />,
  [PrRole.Cost]: <ClusterIcon />,
  '': <ClusterIcon />,
} as const satisfies Record<PrRole | '', ReactElement<any>>

function DynamicRoleIcon({ role }: { role: Nullable<PrRole> }) {
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

export const ColRole = columnHelper.accessor(({ cluster }) => cluster?.name, {
  id: 'role',
  header: 'Role',
  cell: function Cell({ row }) {
    const { role, cluster } = row.original || {}
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

function DeletePrAutomationModal({
  id,
  name,
  refetch,
  open,
  onClose,
}: {
  id: string
  name: string
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeletePrAutomationMutation({
    variables: { id },
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
            &quot;{name}&quot;
          </span>{' '}
          automation?
        </>
      }
    />
  )
}

export const ColSelect = columnHelper.accessor((node) => node, {
  id: 'select',
  header: '',
  cell: function Cell({ table, getValue }) {
    return (
      <Button
        onClick={() => table.options.meta?.selectFn?.(getValue())}
        endIcon={<ArrowRightIcon />}
      >
        Select
      </Button>
    )
  },
})

const ColActions = columnHelper.accessor((node) => node, {
  id: 'actions',
  header: '',
  cell: function Cell({ table, getValue }) {
    const theme = useTheme()
    const { id, name } = getValue()
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()
    const { refetch } = table.options.meta as { refetch?: () => void }

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
        <CreatePrAutomation id={id} />
        <MoreMenu
          onSelectionChange={(newKey) => {
            if (newKey === MenuItemKey.Delete) setMenuKey(MenuItemKey.Delete)
            else setMenuKey(MenuItemKey.Permissions)
          }}
        >
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
            destructive
          />
        </MoreMenu>
        {/* Modals */}
        <DeletePrAutomationModal
          id={id}
          name={name}
          refetch={refetch}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
        <AutomationPermissionsModal
          id={id}
          open={menuKey === MenuItemKey.Permissions}
          onClose={() => setMenuKey('')}
        />
      </div>
    )
  },
})

function AutomationPermissionsModal({
  id,
  open,
  onClose,
}: {
  id: string
  open: boolean
  onClose: () => void
}) {
  const { popToast } = useSimpleToast()
  const [fetchPrAutomation, { data }] = usePrAutomationLazyQuery()

  useEffect(() => {
    if (open && (!data?.prAutomation || data.prAutomation.id !== id)) {
      fetchPrAutomation({ variables: { id } }).then((result) => {
        if (result.error)
          popToast({ content: result.error.message, severity: 'danger' })
      })
    }
  }, [open, data?.prAutomation, fetchPrAutomation, id, popToast])

  const prAutomation = data?.prAutomation

  return (
    <ModalMountTransition open={open && !!prAutomation}>
      <PrAutomationPermissionsModal
        prAutomation={prAutomation!}
        open={open}
        onClose={onClose}
      />
    </ModalMountTransition>
  )
}

export const columns = [ColName, ColRole, ColDocumentation, ColRepo, ColActions]
