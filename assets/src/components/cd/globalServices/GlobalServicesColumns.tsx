import { createColumnHelper } from '@tanstack/react-table'
import { useTheme } from 'styled-components'

import { GlobalService } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { toDateOrUndef } from 'utils/datetime'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { getDistroProviderIconUrl } from 'components/utils/ClusterDistro'
import { GlobeIcon, ListBoxItem, TrashCanIcon } from '@pluralsh/design-system'
import { useState } from 'react'
import { MoreMenu } from 'components/utils/MoreMenu'

import { DeleteGlobalServiceModal } from './DeleteGlobalService'

const columnHelper = createColumnHelper<Edge<GlobalService>>()

enum MenuItemKey {
  None = '',
  Delete = 'delete',
}

export const ColServiceName = columnHelper.accessor(({ node }) => node, {
  id: 'service',
  header: 'Service',
  meta: { truncate: true, gridTemplate: 'minmax(180px,300px)' },
  cell: function Cell({ getValue }) {
    const serviceDeployment = getValue()

    return serviceDeployment ? serviceDeployment.name : '--'
  },
})

export const ColDistribution = columnHelper.accessor(({ node }) => node, {
  id: 'distribution',
  header: 'Distribution',
  meta: { truncate: true, gridTemplate: 'minmax(150px,250px)' },
  cell: ({ getValue }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()
    const globalService = getValue()

    return (
      <ColWithIcon
        icon={
          globalService?.distro ? (
            getDistroProviderIconUrl({
              distro: globalService?.distro,
              provider: globalService?.provider?.cloud,
              mode: theme.mode,
            })
          ) : (
            <GlobeIcon size={16} />
          )
        }
      >
        {globalService?.distro || 'All Distributions'}
      </ColWithIcon>
    )
  },
})

export const ColTags = columnHelper.accessor(({ node }) => node, {
  id: 'tags',
  header: 'Tags',
  meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
  cell: ({ getValue }) => {
    const svc = getValue()

    const tags = svc?.tags
      ?.map((tag) => `${tag?.name}: ${tag?.value}`)
      .join(', ')

    return tags || ''
  },
})

export const ColProject = columnHelper.accessor(
  ({ node }) => node?.project?.name,
  {
    id: 'project',
    header: 'Project',
    meta: { truncate: true, gridTemplate: 'minmax(150px,1fr)' },
  }
)

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

export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  cell: function Cell({ table, getValue }) {
    const globalService = getValue()
    const { refetch } = table.options.meta as { refetch?: () => void }
    const [menuKey, setMenuKey] = useState<MenuItemKey>(MenuItemKey.None)

    if (!globalService) {
      return null
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}
      >
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            destructive
            key={MenuItemKey.Delete}
            leftContent={<TrashCanIcon color="icon-danger" />}
            label="Delete"
            textValue="Delete"
          />
        </MoreMenu>
        {/* Modals */}
        <DeleteGlobalServiceModal
          globalService={globalService}
          refetch={refetch}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey(MenuItemKey.None)}
        />
      </div>
    )
  },
})
