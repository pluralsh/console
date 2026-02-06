import {
  Button,
  Flex,
  ReturnIcon,
  SearchIcon,
  SemanticColorKey,
  Spinner,
  Switch,
  ValidatedInput,
} from '@pluralsh/design-system'

import { useUpdateState } from 'components/hooks/useUpdateState'

import {
  GroupAttributes,
  GroupFragment,
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
import { SimpleToastChip } from 'components/utils/SimpleToastChip'
import { Body2BoldP } from 'components/utils/typography/Text'
import { BindingInput } from 'components/utils/BindingInput'

export type ActionToastInfo = {
  name: Nullable<string>
  action: string
  color: SemanticColorKey
}

export function GroupEditOrCreate({
  group,
  setGroupEdit,
}: {
  group: GroupEditT
  setGroupEdit: (group: Nullable<GroupEditT>) => void
}) {
  const { colors } = useTheme()
  const isCreating = group === GROUP_CREATE_ID_KEY

  const [toast, setToast] = useState<ActionToastInfo | null>(null)
  const [newGroupUsers, setNewGroupUsers] = useState<UserFragment[]>([])

  const { state, update, hasUpdates } = useUpdateState(
    isCreating ? BLANK_GROUP_ATTRIBUTES : groupToAttrs(group)
  )
  const { name, description, global } = state

  const allowSubmit = hasUpdates && !!name

  const popToast = (
    name: Nullable<string>,
    action: string,
    color: SemanticColorKey
  ) => setToast({ name, action, color })

  const [
    createGroup,
    { loading: createGroupLoading, error: createGroupError },
  ] = useCreateGroupMutation({
    onCompleted: ({ createGroup }) => {
      setGroupEdit(createGroup)
      popToast(createGroup?.name, 'created', 'icon-info')
    },
    refetchQueries: ['Groups'],
  })
  const [
    updateGroup,
    { loading: updateGroupLoading, error: updateGroupError },
  ] = useUpdateGroupMutation({
    onCompleted: ({ updateGroup }) => {
      setGroupEdit(updateGroup)
      popToast(updateGroup?.name, 'updated', 'icon-info')
    },
    refetchQueries: ['Groups'],
  })
  const [
    addUserToExistingGroup,
    { loading: createGroupMemberLoading, error: createGroupMemberError },
  ] = useCreateGroupMemberMutation({
    onCompleted: ({ createGroupMember }) =>
      popToast(createGroupMember?.user?.name, 'added', 'icon-success'),
    refetchQueries: ['GroupMembers'],
    awaitRefetchQueries: true,
  })

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
      {error && (
        <GqlError
          error={
            error.message?.includes('could not find resource')
              ? 'One or more users could not be found'
              : error
          }
        />
      )}
      {createGroupMemberError && <GqlError error={createGroupMemberError} />}
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
        <>
          <BindingInput
            type="user"
            add={(user) => addMember?.(user)}
            placeholder="Add a user to group"
            inputProps={{ style: { background: colors['fill-one'] } }}
            icon={createGroupMemberLoading ? <Spinner /> : <SearchIcon />}
          />
          <GroupMembers
            groupId={isCreating ? undefined : group.id}
            addMember={addMember}
            removeMember={removeMember}
            newGroupUsers={newGroupUsers}
            popToast={popToast}
          />
        </>
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
              ? createGroup({
                  variables: {
                    attributes: state,
                    userIds: newGroupUsers.map((user) => user.id),
                  },
                })
              : updateGroup({ variables: { id: group.id, attributes: state } })
          }
        >
          {isCreating ? 'Create group' : 'Save'}
        </Button>
      </Flex>
      <SimpleToastChip
        key={JSON.stringify(toast)}
        show={!!toast}
        delayTimeout={2500}
        onClose={() => setToast(null)}
      >
        {toast?.name}{' '}
        <Body2BoldP $color={toast?.color}>{toast?.action}</Body2BoldP>
      </SimpleToastChip>
    </Flex>
  )
}

const groupToAttrs = (group: GroupFragment): GroupAttributes => ({
  name: group.name,
  description: group.description || '',
  global: !!group.global,
})

const BLANK_GROUP_ATTRIBUTES: GroupAttributes = {
  name: '',
  description: '',
  global: false,
}
