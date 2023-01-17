import { Flex } from 'honorable'
import { PageTitle } from '@pluralsh/design-system'
import { useState } from 'react'

import { List } from '../../utils/List'

import { GroupsList } from './GroupsList'

import GroupCreate from './GroupCreate'
import GroupSearchHeader from './GroupsSearchHeader'

export function Groups() {
  const [q, setQ] = useState('')

  return (
    <Flex
      flexGrow={1}
      flexDirection="column"
      maxHeight="100%"
    >
      <PageTitle heading="Groups">
        <GroupCreate q={q} />
      </PageTitle>
      <List>
        <GroupSearchHeader
          q={q}
          setQ={setQ}
        />
        <GroupsList q={q} />
      </List>
    </Flex>
  )
}
