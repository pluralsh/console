import { Chip, HistoryIcon, ListBoxItem } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ColClusterContentSC } from 'components/cd/clusters/ClustersColumns'
import { DynamicClusterIcon } from 'components/cd/clusters/DynamicClusterIcon'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { StackedText } from 'components/utils/table/StackedText'
import { BasicLink } from 'components/utils/typography/BasicLink'
import {
  ClusterBackup,
  ClusterBasicFragment,
  useCreateClusterRestoreMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CLUSTER_RESTORES_REL_PATH,
  getBackupsClusterAbsPath,
} from 'routes/backupRoutesConsts'
import { useTheme } from 'styled-components'
import { Edge } from 'utils/graphql'

const columnHelper = createColumnHelper<Edge<ClusterBackup>>()

export const ColCluster = columnHelper.accessor(({ node }) => node?.id, {
  id: 'cluster',
  header: 'Cluster',
  cell: ({ table }) => {
    const { cluster } = table.options.meta as {
      cluster?: ClusterBasicFragment
    }

    return (
      <ColClusterContentSC>
        <DynamicClusterIcon
          deleting={!!cluster?.deletedAt}
          protect={!!cluster?.protect}
          self={!!cluster?.self}
        />
        <StackedText
          first={
            <BasicLink css={{ whiteSpace: 'nowrap' }}>
              {cluster?.name}
            </BasicLink>
          }
          second={`handle: ${cluster?.handle}`}
        />
      </ColClusterContentSC>
    )
  },
})
export const ColBackupId = columnHelper.accessor(({ node }) => node?.id, {
  id: 'id',
  header: 'Backup ID',
  enableSorting: true,
  enableGlobalFilter: true,
  cell: ({ getValue }) => getValue(),
})
export const ColBackupDate = columnHelper.accessor(
  ({ node }) => node?.insertedAt,
  {
    id: 'date',
    header: 'Backup date',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }
)
export const ColStatus = columnHelper.accessor(
  ({ node }) => node?.garbageCollected,
  {
    id: 'status',
    header: 'Status',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) =>
      getValue() ? (
        <Chip severity="danger">Garbage collected</Chip>
      ) : (
        <Chip severity="success">Ready</Chip>
      ),
  }
)
export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  meta: { gridTemplate: `fit-content(100px)` },
  cell: function ActionColumn({ getValue }) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const backup = getValue()
    const navigate = useNavigate()
    const theme = useTheme()
    const { clusterId = '' } = useParams()
    const [menuKey, setMenuKey] = useState<Nullable<string>>('')
    const [mutation, { loading, error }] = useCreateClusterRestoreMutation({
      variables: { backupId: backup?.id ?? '' },
      onCompleted: () => {
        setMenuKey('')
        navigate(
          `${getBackupsClusterAbsPath(clusterId)}/${CLUSTER_RESTORES_REL_PATH}`
        )
      },
    })

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
            key={MenuItemKey.Restore}
            leftContent={
              <HistoryIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Restore backup"
            textValue="Restore backup"
          />
        </MoreMenu>
        {/* Modals */}
        {backup && (
          <Confirm
            close={() => setMenuKey('')}
            destructive
            label="Restore"
            loading={loading}
            error={error}
            open={menuKey === MenuItemKey.Restore}
            submit={() => mutation()}
            title="Restore cluster configuration"
            text={`Are you sure you want to restore ${backup?.cluster?.name} configuration?`}
          />
        )}
      </div>
    )
  },
})

enum MenuItemKey {
  Restore = 'restore',
}
