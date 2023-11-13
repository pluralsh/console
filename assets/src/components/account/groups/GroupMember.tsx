import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { ListItem } from 'components/utils/List'
import {
  GroupMembersDocument,
  useDeleteGroupMemberMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'

import UserInfo from '../../utils/UserInfo'

export default function GroupMember({ user, group, last, edit }: any) {
  const theme = useTheme()
  const [mutation] = useDeleteGroupMemberMutation({
    variables: { groupId: group.id, userId: user.id },
    refetchQueries: [
      { query: GroupMembersDocument, variables: { id: group.id } },
    ],
  })

  return (
    <ListItem
      flex={false}
      background="fill-two"
      last={last}
      title=""
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          columnGap: theme.spacing.small,
        }}
      >
        <UserInfo
          user={user}
          hue="lightest"
          css={{ width: '100%' }}
        />
        {edit && (
          <IconFrame
            size="medium"
            clickable
            icon={<TrashCanIcon color="icon-danger" />}
            textValue="Delete"
            onClick={() => mutation()}
          />
        )}
      </div>
    </ListItem>
  )
}
