import { useState } from 'react'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { List } from '../../utils/List'

import RoleCreate from './RoleCreate'
import RolesList from './RolesList'
import RolesSearchHeader from './RolesSearchHeader'

export default function Roles() {
  const [q, setQ] = useState('')

  return (
    <ScrollablePage
      scrollable={false}
      heading="Roles"
      headingContent={<RoleCreate q={q} />}
    >
      <List height="100%">
        <RolesSearchHeader
          q={q}
          setQ={setQ}
        />
        <RolesList q={q} />
      </List>
    </ScrollablePage>
  )
}
