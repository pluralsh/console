import { GearTrainIcon, IconFrame, PeopleIcon } from '@pluralsh/design-system'
import { useContext, useState } from 'react'

import { Confirm } from 'components/utils/Confirm'

import { LoginContext } from 'components/contexts'

import { Button, Flex, Modal } from 'honorable'

import { Group as GroupT, GroupsDocument, useDeleteGroupMutation } from 'generated/graphql'

import { DeleteIconButton } from 'components/utils/IconButtons'

import { removeConnection, updateCache } from '../../../utils/graphql'

import { Info } from '../../utils/Info'

import { Permissions, hasRbac } from '../misc'

import { EditGroupAttributes, EditGroupMembers } from './GroupEdit'
import GroupView from './GroupView'

export default function Group({ group, q }: { group: GroupT; q: any }) {
  const { me } = useContext<any>(LoginContext)
  const editable = !!me.roles?.admin || hasRbac(me, Permissions.USERS)
  const [dialogKey, setDialogKey] = useState<
    'confirmDelete' | 'editAttrs' | 'editMembers' | 'viewGroup' | ''
  >('')

  const [mutation, { loading, error }] = useDeleteGroupMutation({
    variables: { id: group.id },
    onCompleted: () => dialogKey === 'confirmDelete' && setDialogKey(''),
    update: (cache, { data }) => updateCache(cache, {
      query: GroupsDocument,
      variables: { q },
      update: prev => removeConnection(prev, data?.deleteGroup, 'groups'),
    }),
  })

  return (
    <Flex
      width="100%"
      flexDirection="row"
      alignItems="center"
    >
      <Info
        text={group.name}
        description={group.description || 'no description'}
      />
      <Flex
        flex={false}
        direction="row"
        gap="large"
        align="center"
      >
        {!editable && (
          <Button
            secondary
            small
            onClick={() => dialogKey === '' && setDialogKey('viewGroup')}
          >
            View
          </Button>
        )}
        {editable && (
          <Flex gap="xsmall">
            <>
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
            </>
          </Flex>
        )}
      </Flex>
      <>
        <Modal
          portal
          header="View group"
          open={dialogKey === 'viewGroup'}
          onClose={() => dialogKey === 'viewGroup' && setDialogKey('')}
        >
          <GroupView group={group} />
        </Modal>
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
          text={(
            <>
              Are you sure you want to delete the <b>{group.name}</b> group?
              This could have downstream effects on a large number of users and
              their roles.
            </>
          )}
          close={() => dialogKey === 'confirmDelete' && setDialogKey('')}
          label="Delete group"
          submit={() => mutation()}
          loading={loading}
          destructive
          error={error}
        />
      </>
    </Flex>
  )
}
