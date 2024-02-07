import { ReactElement, useState } from 'react'
import {
  GitHubLogoIcon,
  GitLabLogoIcon,
  HelpIcon,
  IconFrame,
  ListBoxItem,
  PeopleIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import {
  ScmConnectionFragment,
  ScmType,
  useDeleteScmConnectionMutation,
} from 'generated/graphql'

import { Edge } from 'utils/graphql'
import { Confirm } from 'components/utils/Confirm'
import { TruncateStart } from 'components/utils/table/TruncateStart'
import { MoreMenu } from 'components/utils/MoreMenu'
import { StackedText } from 'components/utils/table/StackedText'

enum MenuItemKey {
  Permissions = 'permissions',
  Delete = 'delete',
}

export const columnHelper = createColumnHelper<Edge<ScmConnectionFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Connection name',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const ColBaseUrl = columnHelper.accessor(({ node }) => node?.baseUrl, {
  id: 'baseUrl',
  header: 'Base url',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return (
      <TruncateStart>
        <span>{getValue()}</span>
      </TruncateStart>
    )
  },
})

const ColApiUrl = columnHelper.accessor(({ node }) => node?.apiUrl, {
  id: 'apiUrl',
  header: 'API url',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return (
      <TruncateStart>
        <span>{getValue()}</span>
      </TruncateStart>
    )
  },
})

const DynamicScmTypeIconSC = styled.div((_) => ({
  position: 'relative',
}))

const scmTypeToLabel = {
  [ScmType.Github]: 'GitHub',
  [ScmType.Gitlab]: 'GitLab',
  '': 'Unknown',
} as const satisfies Record<ScmType | '', string>

const scmTypeToIcon = {
  [ScmType.Github]: <GitHubLogoIcon fullColor />,
  [ScmType.Gitlab]: <GitLabLogoIcon fullColor />,
  '': <HelpIcon />,
} as const satisfies Record<ScmType | '', ReactElement>

export function DynamicScmTypeIcon({ type }: { type: Nullable<ScmType> }) {
  const icon = scmTypeToIcon[type || ''] || scmTypeToIcon['']

  return (
    <DynamicScmTypeIconSC>
      <IconFrame
        size="medium"
        type="tertiary"
        icon={icon}
      />
    </DynamicScmTypeIconSC>
  )
}

const ColTypeSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))
const ColType = columnHelper.accessor(({ node }) => node?.type, {
  id: 'type',
  header: 'Provider type',
  cell: function Cell({ getValue }) {
    const type = getValue()
    const label = scmTypeToLabel[type || ''] || scmTypeToLabel['']

    return (
      <ColTypeSC>
        <DynamicScmTypeIcon type={type} />
        <StackedText first={label} />
      </ColTypeSC>
    )
  },
})

export function DeleteScmConnectionModal({
  scmConnection,
  refetch,
  open,
  onClose,
}: {
  scmConnection: ScmConnectionFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteScmConnectionMutation({
    variables: { id: scmConnection.id },
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
      title="Delete SCM connection"
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{scmConnection.name}”
          </span>{' '}
          connection?
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
    const scmConnection = getValue()
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()
    const { refetch } = table.options.meta as { refetch?: () => void }

    if (!scmConnection) {
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
            label="Delete connection"
            textValue="Delete connection"
          />
        </MoreMenu>
        {/* Modals */}
        <DeleteScmConnectionModal
          scmConnection={scmConnection}
          refetch={refetch}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
        {/* <ClusterPermissionsModal
          cluster={cluster}
          open={menuKey === MenuItemKey.Permissions}
          onClose={() => setMenuKey('')}
        /> */}
      </div>
    )
  },
})

export const columns = [ColType, ColName, ColBaseUrl, ColApiUrl, ColActions]
