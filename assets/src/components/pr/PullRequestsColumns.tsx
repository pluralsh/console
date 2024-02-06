import { useState } from 'react'
import {
  Chip,
  IconFrame,
  LinkoutIcon,
  ListBoxItem,
  PeopleIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import { PullRequestFragment } from 'generated/graphql'

import { Edge } from 'utils/graphql'
import { MoreMenu } from 'components/utils/MoreMenu'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { ColClusterContent } from 'components/cd/clusters/ClustersColumns'

enum MenuItemKey {
  Option1 = 'option1',
}

export const columnHelper = createColumnHelper<Edge<PullRequestFragment>>()

const ColTitle = columnHelper.accessor(({ node }) => node?.title, {
  id: 'title',
  header: 'PR Title',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

// const ColStatus = columnHelper.accessor(({ node }) => node?.status, {
//   id: 'status',
//   header: 'Status',
//   cell: function Cell({ getValue }) {
//     return <Chip severity="critical">{getValue()}</Chip>
//   },
// })

const ColAuthor = columnHelper.accessor(({ node }) => node?.id, {
  id: 'author',
  header: 'Author',
  cell: function Cell({ getValue }) {
    const theme = useTheme()

    return (
      <>
        <div css={{ color: theme.colors['text-danger'] }}>
          !!Author missing for:{' '}
        </div>
        {getValue()}
      </>
    )
  },
})

const ColLabelsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flexWrap: 'wrap',
}))
const ColLabels = columnHelper.accessor(
  ({ node }) => node?.labels?.join(', ') || '',
  {
    id: 'labels',
    header: 'Labels',
    cell: function Cell({ row: { original } }) {
      const labels = original.node?.labels

      return (
        <ColLabelsSC>
          {labels?.map?.((label) => label && <Chip>{label}</Chip>)}
        </ColLabelsSC>
      )
    },
  }
)

const ColInsertedAt = columnHelper.accessor(({ node }) => node?.insertedAt, {
  id: 'insertedAt',
  header: 'Date',
  cell: function Cell({ getValue }) {
    return <DateTimeCol date={getValue()} />
  },
})

const ColCluster = columnHelper.accessor(({ node }) => node?.cluster?.name, {
  id: 'cluster',
  header: 'Cluster',
  cell: function Cell({ row }) {
    return <ColClusterContent cluster={row.original?.node?.cluster} />
  },
})

const ColLink = columnHelper.accessor(({ node }) => node?.url, {
  id: 'link',
  header: 'Link',
  cell: function Cell({ getValue }) {
    const theme = useTheme()

    return (
      <IconFrame
        icon={<LinkoutIcon color={theme.colors['action-link-inline']} />}
        as="a"
        href={getValue()}
        target="_blank"
        rel="noopener noreferrer"
      />
    )
  },
})

export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  cell: function Cell({ getValue }) {
    const pullReq = getValue()
    const [_, setMenuKey] = useState<MenuItemKey>()

    if (!pullReq) {
      return null
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}
      >
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Option1}
            leftContent={<PeopleIcon />}
            label="Option 1"
            textValue="Permissions"
          />
        </MoreMenu>
        {/* Modals */}
      </div>
    )
  },
})

export const columns = [
  ColTitle,
  // ColStatus,
  ColInsertedAt,
  ColCluster,
  ColAuthor,
  ColLabels,
  ColLink,
]
