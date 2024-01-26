import { useState } from 'react'
import {
  IconFrame,
  LinkoutIcon,
  ListBoxItem,
  PeopleIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { PullRequestFragment } from 'generated/graphql'

import { Edge } from 'utils/graphql'

import { MoreMenu } from 'components/utils/MoreMenu'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { useTheme } from 'styled-components'

enum MenuItemKey {
  Option1 = 'option1',
}

export const columnHelper = createColumnHelper<Edge<PullRequestFragment>>()

const ColTitle = columnHelper.accessor(({ node }) => node?.title, {
  id: 'cluster',
  header: 'Cluster',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const ColUpdatedAt = columnHelper.accessor(({ node }) => node?.updatedAt, {
  id: 'updatedAt',
  header: 'Last update',
  cell: function Cell({ getValue }) {
    return <DateTimeCol date={getValue()} />
  },
})

const ColInsertedAt = columnHelper.accessor(({ node }) => node?.insertedAt, {
  id: 'insertedAt',
  header: 'Date added',
  cell: function Cell({ getValue }) {
    return <DateTimeCol date={getValue()} />
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

export const columns = [ColTitle, ColInsertedAt, ColUpdatedAt, ColLink]
