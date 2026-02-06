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
  useCreateGroupMutation,
  useUpdateGroupMutation,
} from 'generated/graphql'

import { GqlError } from '../../../utils/Alert'

import { useTheme } from 'styled-components'
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
    variables: { attributes: state },
  })
  const [
    updateGroup,
    { loading: updateGroupLoading, error: updateGroupError },
  ] = useUpdateGroupMutation()

  const loading = createGroupLoading || updateGroupLoading
  const error = createGroupError || updateGroupError

  return (
    <Flex
      direction="column"
      gap="medium"
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
      {!(isCreating && !!global) && <div>users table</div>}
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
