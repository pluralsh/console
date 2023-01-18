import { useMutation } from '@apollo/client'
import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { ListItem } from 'components/utils/List'
import { Box } from 'grommet'

import UserInfo from '../../utils/UserInfo'

import { DELETE_GROUP_MEMBER, GROUP_MEMBERS } from './queries'

export default function GroupMember({
  user, group, first, last, edit,
}: any) {
  const [mutation] = useMutation(DELETE_GROUP_MEMBER, {
    variables: { groupId: group.id, userId: user.id },
    refetchQueries: [{ query: GROUP_MEMBERS, variables: { id: group.id } }],
  })

  return (
    <ListItem
      flex={false}
      background="fill-two"
      first={first}
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
            hue="lighter"
          />
        )}
      </Box>
    </ListItem>
  )
}
