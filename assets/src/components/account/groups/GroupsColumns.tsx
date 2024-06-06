import {
  Button,
  GearTrainIcon,
  IconFrame,
  PeopleIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { Info } from 'components/utils/Info'
import {
  Group,
  GroupsDocument,
  useDeleteGroupMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'

import { removeConnection, updateCache } from 'utils/graphql'

import { EditGroupAttributes, EditGroupMembers } from './GroupEdit'
import GroupView from './GroupView'
import { GROUPS_QUERY_PAGE_SIZE } from './Groups'

const columnHelper = createColumnHelper<Group>()
const ColGroupInfo = columnHelper.accessor((group) => group, {
  id: 'info',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const group = getValue()

    return (
      <Info
        text={group?.name}
        description={group?.description || 'no description'}
      />
    )
  },
})

const ColEditableActions = columnHelper.accessor((group) => group, {
  id: 'actions',
  meta: { gridTemplate: 'auto' },
  cell: function Cell({ getValue, table }) {
    const group = getValue()

    const theme = useTheme()
    const [dialogKey, setDialogKey] = useState<
      'confirmDelete' | 'editAttrs' | 'editMembers' | ''
    >('')

    const [mutation, { loading, error }] = useDeleteGroupMutation({
      variables: { id: group.id },
      onCompleted: () => dialogKey === 'confirmDelete' && setDialogKey(''),
      update: (cache, { data }) =>
        updateCache(cache, {
          query: GroupsDocument,
          variables: {
            q: table.options.meta?.q,
            first: GROUPS_QUERY_PAGE_SIZE,
          },
          update: (prev) => removeConnection(prev, data?.deleteGroup, 'groups'),
        }),
    })

    return (
      <>
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <IconFrame
            clickable
            size="medium"
            onClick={() => dialogKey === '' && setDialogKey('editAttrs')}
            tooltip="Edit attributes"
            icon={<GearTrainIcon />}
          />
          <IconFrame
            clickable
            size="medium"
            onClick={() => dialogKey === '' && setDialogKey('editMembers')}
            tooltip="Edit members"
            icon={<PeopleIcon />}
          />
          <DeleteIconButton
            onClick={() => dialogKey === '' && setDialogKey('confirmDelete')}
          />
        </div>
        <EditGroupAttributes
          group={group}
          open={dialogKey === 'editAttrs'}
          onClose={() => dialogKey === 'editAttrs' && setDialogKey('')}
        />
        <EditGroupMembers
          group={group}
          open={dialogKey === 'editMembers'}
          onClose={() => dialogKey === 'editMembers' && setDialogKey('')}
        />
        <Confirm
          open={dialogKey === 'confirmDelete'}
          text={
            <>
              Are you sure you want to delete the <b>{group.name}</b> group?
              This could have downstream effects on a large number of users and
              their roles.
            </>
          }
          close={() => dialogKey === 'confirmDelete' && setDialogKey('')}
          label="Delete group"
          submit={() => mutation()}
          loading={loading}
          destructive
          error={error}
        />
      </>
    )
  },
})

const ColViewActions = columnHelper.accessor((group) => group, {
  id: 'actions',
  meta: { gridTemplate: 'auto' },
  cell: function Cell({ getValue }) {
    const group = getValue()
    const [dialogKey, setDialogKey] = useState<'viewGroup' | ''>('')

    return (
      <>
        <Button
          secondary
          small
          onClick={() => dialogKey === '' && setDialogKey('viewGroup')}
        >
          View
        </Button>
        <GroupView
          open={dialogKey === 'viewGroup'}
          onClose={() => dialogKey === 'viewGroup' && setDialogKey('')}
          group={group}
        />
      </>
    )
  },
})

export const groupsColsEditable = [ColGroupInfo, ColEditableActions]
export const groupsColsView = [ColGroupInfo, ColViewActions]
