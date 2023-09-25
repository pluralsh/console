import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { ListItem } from 'components/utils/List'
import {
  GroupMembersDocument,
  useDeleteGroupMemberMutation,
} from 'generated/graphql'
import { Box } from 'grommet'

import UserInfo from '../../utils/UserInfo'

export default function GroupMember({ user, group, last, edit }: any) {
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
      <Box
        flex={false}
        fill="horizontal"
        direction="row"
        align="center"
      >
        <UserInfo
          user={user}
          fill="horizontal"
          hue="lightest"
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
      </Box>
    </ListItem>
  )
}
