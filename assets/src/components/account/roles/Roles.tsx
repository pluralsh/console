import { Flex } from 'honorable'
import { PageTitle } from '@pluralsh/design-system'
import { useState } from 'react'

import { List } from '../../utils/List'

import RoleCreate from './RoleCreate'
import RolesList from './RolesList'
import RolesSearchHeader from './RolesSearchHeader'

export default function Roles() {
  const [q, setQ] = useState('')

  return (
    <Flex
      flexGrow={1}
      flexDirection="column"
      maxHeight="100%"
    >
      <PageTitle heading="Roles"><RoleCreate q={q} /></PageTitle>
      <List>
        <RolesSearchHeader
          q={q}
          setQ={setQ}
        />
        <RolesList q={q} />
      </List>
    </Flex>
  )
}
