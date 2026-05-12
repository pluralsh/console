import {
  EyeIcon,
  Flex,
  IconFrame,
  Modal,
  PencilIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { Info } from 'components/utils/Info'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { GroupFragment, useDeleteGroupMutation } from 'generated/graphql'
import { useState } from 'react'

import { GroupMembers } from './GroupMembers'
import { GroupsListMeta } from './GroupsList'

const columnHelper = createColumnHelper<GroupFragment>()
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

const ColActions = columnHelper.accessor((group) => group, {
  id: 'actions',
  cell: function Cell({ getValue, table: { options } }) {
    const group = getValue()
    const { editable, setGroupEdit } = options.meta as GroupsListMeta
    const { popToast } = useSimpleToast()
    const [dialogKey, setDialogKey] = useState<
      'viewGroup' | 'confirmDelete' | ''
    >('')

    const [mutation, { loading, error }] = useDeleteGroupMutation({
      variables: { id: group.id },
      onCompleted: () => {
        popToast({ content: `${group.name} deleted`, severity: 'danger' })
        setDialogKey('')
      },
      refetchQueries: ['Groups'],
      awaitRefetchQueries: true,
    })

    if (!editable)
      return (
        <>
          <IconFrame
            clickable
            size="medium"
            onClick={() => setDialogKey('viewGroup')}
            tooltip="View group"
            icon={<EyeIcon />}
          />
          <Modal
            header={group.name}
            open={dialogKey === 'viewGroup'}
            onClose={() => setDialogKey('')}
          >
            <GroupMembers
              viewOnly
              groupId={group.id}
            />
          </Modal>
        </>
      )

    return (
      <>
        <Flex gap="xsmall">
          <IconFrame
            clickable
            tooltip="Edit group settings"
            icon={<PencilIcon />}
            onClick={() => setGroupEdit(group)}
          />
          <DeleteIconButton onClick={() => setDialogKey('confirmDelete')} />
        </Flex>
        <Confirm
          open={dialogKey === 'confirmDelete'}
          text={
            <>
              Are you sure you want to delete the <b>{group.name}</b> group?
              This could have downstream effects on a large number of users and
              their roles.
            </>
          }
          close={() => setDialogKey('')}
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

export const groupsCols = [ColGroupInfo, ColActions]
