import {
  Button,
  Flex,
  ReturnIcon,
  Switch,
  ValidatedInput,
} from '@pluralsh/design-system'

import { useUpdateState } from 'components/hooks/useUpdateState'

import {
  GroupAttributes,
  useCreateGroupMemberMutation,
  useCreateGroupMutation,
  UserFragment,
  useUpdateGroupMutation,
} from 'generated/graphql'

import { GqlError } from '../../../utils/Alert'

import { useState } from 'react'
import { useTheme } from 'styled-components'
import { GroupMembers } from './GroupMembers'
import { GROUP_CREATE_ID_KEY, GroupEditT } from './Groups'

export function GroupEditOrCreate({
  group,
  setGroupEdit,
}: {
  group: GroupEditT
  setGroupEdit: (group: Nullable<GroupEditT>) => void
}) {
  const { colors } = useTheme()
  const isCreating = group === GROUP_CREATE_ID_KEY
  const [newGroupUsers, setNewGroupUsers] = useState<UserFragment[]>([])

  const { state, update, hasUpdates } = useUpdateState(
    isCreating
      ? BLANK_GROUP_ATTRIBUTES
      : {
          name: group.name,
          description: group.description,
          global: group.global,
        }
  )
  const { name, description, global } = state

  const allowSubmit = hasUpdates && !!name

  const [
    createGroup,
    { loading: createGroupLoading, error: createGroupError },
  ] = useCreateGroupMutation({
    variables: {
      attributes: state,
      userIds: newGroupUsers.map((user) => user.id),
    },
  })
  const [
    updateGroup,
    { loading: updateGroupLoading, error: updateGroupError },
  ] = useUpdateGroupMutation()
  const [
    addUserToExistingGroup,
    // { loading: createGroupMemberLoading, error: createGroupMemberError },
  ] = useCreateGroupMemberMutation()

  const addMember = (user: UserFragment) =>
    isCreating
      ? setNewGroupUsers([...newGroupUsers, user])
      : addUserToExistingGroup({
          variables: { groupId: group.id, userId: user.id },
        })

  const removeMember = isCreating
    ? (user: UserFragment) =>
        setNewGroupUsers(newGroupUsers.filter((u) => u.id !== user.id))
    : undefined

  const loading = createGroupLoading || updateGroupLoading
  const error = createGroupError || updateGroupError

  return (
    <Flex
      direction="column"
      gap="medium"
      minHeight={0}
    >
      {error && <GqlError error={error} />}
      <ValidatedInput
        label="Group name"
        value={name}
        onChange={({ target: { value } }) => update({ name: value })}
        placeholder="Enter group name"
        css={{ background: colors['fill-one'] }}
      />
      <ValidatedInput
        label="Group description"
        value={description}
        onChange={({ target: { value } }) => update({ description: value })}
        placeholder="Enter group description"
        css={{ background: colors['fill-one'] }}
      />
      <Switch
        checked={!!global}
        onChange={(checked) => update({ global: checked })}
      >
        Add all users to this group (also adds future users on account creation)
      </Switch>
      {!(isCreating && !!global) && (
        <GroupMembers
          groupId={isCreating ? undefined : group.id}
          addMember={addMember}
          removeMember={removeMember}
          newGroupUsers={newGroupUsers}
        />
      )}
      <Flex
        gap="medium"
        alignSelf="flex-end"
      >
        <Button
          secondary
          startIcon={<ReturnIcon />}
          onClick={() => setGroupEdit(null)}
        >
          Back to all groups
        </Button>
        <Button
          disabled={!allowSubmit}
          loading={loading}
          onClick={() =>
            isCreating
              ? createGroup()
              : updateGroup({ variables: { id: group.id, attributes: state } })
          }
        >
          {isCreating ? 'Create group' : 'Save'}
        </Button>
      </Flex>
    </Flex>
  )
}

const BLANK_GROUP_ATTRIBUTES: GroupAttributes = {
  name: '',
  description: '',
  global: false,
}
