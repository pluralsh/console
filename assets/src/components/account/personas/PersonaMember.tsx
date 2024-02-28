import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { ListItem } from 'components/utils/List'
import {
  PersonaMembersDocument,
  useDeletePersonaMemberMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'

import UserInfo from '../../utils/UserInfo'

export default function PersonaMember({ user, persona, last, edit }: any) {
  const theme = useTheme()
  const [mutation] = useDeletePersonaMemberMutation({
    variables: { personaId: persona.id, userId: user.id },
    refetchQueries: [
      { query: PersonaMembersDocument, variables: { id: persona.id } },
    ],
  })

  return (
    <ListItem
      flex={false}
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
