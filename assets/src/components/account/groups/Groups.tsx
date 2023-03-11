import { useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { Flex } from 'honorable'

import { List } from '../../utils/List'

import { GroupsList } from './GroupsList'
import GroupCreate from './GroupCreate'
import GroupSearchHeader from './GroupsSearchHeader'

export function Groups() {
  const [q, setQ] = useState('')

  return (
    <ScrollablePage
      scrollable={false}
      heading="Groups"
      headingContent={<GroupCreate q={q} />}
    >
      <Flex
        direction="column"
        height="100%"
      >
        <List height="100%">
          <GroupSearchHeader
            q={q}
            setQ={setQ}
          />
          <GroupsList q={q} />
        </List>
      </Flex>
    </ScrollablePage>
  )
}
