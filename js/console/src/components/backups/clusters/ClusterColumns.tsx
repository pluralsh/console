import { createColumnHelper } from '@tanstack/react-table'

import { useTheme } from 'styled-components'
import { useState } from 'react'
import { ListBoxItem, TrashCanIcon } from '@pluralsh/design-system'

import { MoreMenu } from 'components/utils/MoreMenu'

import { Confirm } from 'components/utils/Confirm'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'

import { ColClusterContentSC } from 'components/cd/clusters/ClustersColumns'

import { DynamicClusterIcon } from 'components/cd/clusters/DynamicClusterIcon'

import { StackedText } from 'components/utils/table/StackedText'

import { BasicLink } from 'components/utils/typography/BasicLink'

import {
  ClustersObjectStoresFragment,
  useDeleteObjectStoreMutation,
} from '../../../generated/graphql'
import { Edge } from '../../../utils/graphql'
import {
  ObjectStoreCloudIcon,
  getObjectStoreCloud,
  objectStoreCloudToDisplayName,
} from '../objectstores/utils'

const columnHelper = createColumnHelper<Edge<ClustersObjectStoresFragment>>()

export const ColCluster = columnHelper.accessor(({ node }) => node?.name, {
  id: 'cluster',
  header: 'Cluster',
  enableSorting: true,
  enableGlobalFilter: true,
  cell: ({
    row: {
      original: { node: cluster },
    },
  }) => (
    <ColClusterContentSC>
      <DynamicClusterIcon
        deleting={!!cluster?.deletedAt}
        protect={!!cluster?.protect}
        self={!!cluster?.self}
      />
      <StackedText
        first={
          <BasicLink css={{ whiteSpace: 'nowrap' }}>{cluster?.name}</BasicLink>
        }
        second={`handle: ${cluster?.handle}`}
      />
    </ColClusterContentSC>
  ),
})

export const ColProvider = columnHelper.accessor(
  ({ node }) => node?.objectStore,
  {
    id: 'provider',
    header: 'Storage provider',
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
  }
)

export const ColName = columnHelper.accessor(
  ({ node }) => node?.objectStore?.name,
  {
    id: 'name',
    header: 'Storage name',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }
)

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
            title="Delete backups configuration"
            text={`Are you sure you want to delete ${node?.name} backups configuration?`}
          />
        )}
      </div>
    )
  },
})

enum MenuItemKey {
  Delete = 'delete',
}
