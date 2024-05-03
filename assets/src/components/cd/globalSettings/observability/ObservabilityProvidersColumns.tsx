import { ReactElement, useState } from 'react'
import {
  GitHubLogoIcon,
  GitLabLogoIcon,
  HelpIcon,
  IconFrame,
  ListBoxItem,
  PencilIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import {
  ObservabilityProviderFragment,
  ObservabilityProviderType,
  ObservabilityProvidersDocument,
  useDeleteObservabilityProviderMutation,
} from 'generated/graphql'

import { Edge, removeConnection, updateCache } from 'utils/graphql'
import { Confirm } from 'components/utils/Confirm'
import { StackedText } from 'components/utils/table/StackedText'
import { MoreMenu } from 'components/utils/MoreMenu'

import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { toDateOrUndef } from 'utils/date'

import { EditObservabilityProviderModal } from './EditObservabilityProvider'

enum MenuItemKey {
  Edit = 'edit',
  Delete = 'delete',
}

export const columnHelper =
  createColumnHelper<Edge<ObservabilityProviderFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Connection name',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const DynamicObservabilityProviderTypeIconSC = styled.div((_) => ({
  position: 'relative',
}))

export const observabilityproviderTypeToLabel = {
  [ObservabilityProviderType.Datadog]: 'Datadog',
  [ObservabilityProviderType.Newrelic]: 'Newrelic',
  '': 'Unknown',
} as const satisfies Record<ObservabilityProviderType | '', string>

export const observabilityproviderTypeToIcon = {
  [ObservabilityProviderType.Datadog]: <GitHubLogoIcon fullColor />,
  [ObservabilityProviderType.Newrelic]: <GitLabLogoIcon fullColor />,
  '': <HelpIcon />,
} as const satisfies Record<ObservabilityProviderType | '', ReactElement>

export function DynamicObservabilityProviderTypeIcon({
  type,
}: {
  type: Nullable<ObservabilityProviderType>
}) {
  const icon =
    observabilityproviderTypeToIcon[type || ''] ||
    observabilityproviderTypeToIcon['']

  return (
    <DynamicObservabilityProviderTypeIconSC>
      <IconFrame
        size="medium"
        type="tertiary"
        icon={icon}
      />
    </DynamicObservabilityProviderTypeIconSC>
  )
}

const ColTypeSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

export function ObservabilityProviderTypeCell({ getValue }) {
  const type = getValue()
  const label =
    observabilityproviderTypeToLabel[type || ''] ||
    observabilityproviderTypeToLabel['']

  return (
    <ColTypeSC>
      <DynamicObservabilityProviderTypeIcon type={type} />
      <StackedText first={label} />
    </ColTypeSC>
  )
}
export const ColType = columnHelper.accessor(({ node }) => node?.type, {
  id: 'type',
  header: 'Provider type',
  cell: ObservabilityProviderTypeCell,
})

export function DeleteObservabilityProviderModal({
  observabilityProvider,
  open,
  onClose,
}: {
  observabilityProvider: ObservabilityProviderFragment
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteObservabilityProviderMutation(
    {
      variables: { id: observabilityProvider.id },
      update: (cache, { data }) =>
        updateCache(cache, {
          variables: {},
          query: ObservabilityProvidersDocument,
          update: (prev) =>
            removeConnection(
              prev,
              data?.deleteObservabilityProvider,
              'observabilityProviders'
            ),
        }),
      onCompleted: () => {
        onClose?.()
      },
    }
  )

  return (
    <Confirm
      close={() => onClose?.()}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="Delete OBSERVABILITY PROVIDER"
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{observabilityProvider.name}”
          </span>
          ?
        </>
      }
    />
  )
}

export const ColActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell({ row }) {
    const theme = useTheme()
    const observabilityProvider = row.original?.node
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()

    if (!observabilityProvider) {
      return null
    }

    return (
      <>
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Edit}
            leftContent={<PencilIcon />}
            label="Edit provider"
            textValue="Edit provider"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete provider"
            textValue="Delete provider"
          />
        </MoreMenu>
        {/* Modals */}
        <EditObservabilityProviderModal
          observabilityProvider={observabilityProvider}
          open={menuKey === MenuItemKey.Edit}
          onClose={() => setMenuKey('')}
        />
        <DeleteObservabilityProviderModal
          observabilityProvider={observabilityProvider}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
      </>
    )
  },
})

export const ColLastActivity = columnHelper.accessor(
  ({ node }) => {
    const updatedAt = toDateOrUndef(node?.updatedAt)
    const insertedAt = toDateOrUndef(node?.insertedAt)

    return updatedAt || insertedAt || undefined
  },
  {
    id: 'lastUpdated',
    header: 'Last Updated ',
    sortingFn: 'datetime',
    cell: ({ getValue }) => <DateTimeCol date={getValue()?.toISOString()} />,
  }
)

export const columns = [ColType, ColName, ColActions]
