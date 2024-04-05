import { createColumnHelper } from '@tanstack/react-table'

import { useTheme } from 'styled-components'
import { useState } from 'react'
import {
  GearTrainIcon,
  ListBoxItem,
  TrashCanIcon,
} from '@pluralsh/design-system'

import { MoreMenu } from 'components/utils/MoreMenu'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { Confirm } from 'components/utils/Confirm'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'

import {
  ObjectStore,
  useDeleteObjectStoreMutation,
} from '../../../generated/graphql'
import { Edge } from '../../../utils/graphql'

import SaveObjectStoreModal from './SaveObjectStoreModal'
import {
  ObjectStoreCloudIcon,
  getObjectStoreCloud,
  objectStoreCloudToDisplayName,
} from './utils'

const columnHelper = createColumnHelper<Edge<ObjectStore>>()

export const ColProvider = columnHelper.accessor(({ node }) => node, {
  id: 'provider',
  header: 'Provider',
  meta: { gridTemplate: `240px` },
  cell: ({ getValue }) => {
    const cloud = getObjectStoreCloud(getValue())

    if (!cloud) return null

    return (
      <ColWithIcon
        truncateLeft
        icon={<ObjectStoreCloudIcon cloud={cloud} />}
      >
        {objectStoreCloudToDisplayName[cloud]}
      </ColWithIcon>
    )
  },
})

export const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Storage name',
  enableSorting: true,
  enableGlobalFilter: true,
  cell: ({ getValue }) => getValue(),
})

export const ColActions = columnHelper.accessor(({ node }) => node?.id, {
  id: 'actions',
  header: '',
  meta: { gridTemplate: `fit-content(100px)` },
  cell: function ActionColumn({
    table,
    row: {
      original: { node },
    },
  }) {
    const theme = useTheme()
    const [menuKey, setMenuKey] = useState<Nullable<string>>('')
    const [mutation, { loading, error }] = useDeleteObjectStoreMutation({
      variables: { id: node?.id || '' },
      onCompleted: () => {
        setMenuKey('')
        refetch?.()
      },
    })
    const { refetch } = table.options.meta as { refetch?: () => void }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{
          width: '100%',
          display: 'flex',
          gap: theme.spacing.large,
          alignItems: 'center',
          justifyContent: 'end',
        }}
      >
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Settings}
            leftContent={<GearTrainIcon />}
            label="Settings"
            textValue="Settings"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete backup"
            textValue="Delete backup"
          />
        </MoreMenu>
        {/* Modals */}
        {node && (
          <Confirm
            close={() => setMenuKey('')}
            destructive
            label="Delete"
            loading={loading}
            error={error}
            open={menuKey === MenuItemKey.Delete}
            submit={() => mutation()}
            title="Delete object store"
            text={`Are you sure you want to delete ${node.name}?`}
          />
        )}
        {node && (
          <ModalMountTransition open={menuKey === MenuItemKey.Settings}>
            <SaveObjectStoreModal
              open={menuKey === MenuItemKey.Settings}
              onClose={() => setMenuKey('')}
              refetch={refetch}
              objectStore={node}
            />
          </ModalMountTransition>
        )}
      </div>
    )
  },
})

enum MenuItemKey {
  Settings = 'settings',
  Delete = 'delete',
}
