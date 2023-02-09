import { Flex } from 'honorable'
import { TabPanel } from '@pluralsh/design-system'
import { useContext, useRef, useState } from 'react'

import { LoginContext } from 'components/contexts'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import UserList from './UsersList'
import UserInvite from './UserInvite'

// const directory = [
//   {
//     key: 'Users',
//     label: 'Users',
//   },
//   {
//     key: 'Invites',
//     label: 'Invites',
//   },
// ]

export default function Users() {
  const { configuration } = useContext<any>(LoginContext)
  const [selectedKey] = useState<any>('Users')
  const tabStateRef = useRef<any>(null)

  return (
    <ScrollablePage
      scrollable={false}
      heading="Users"
      headingContent={(
        <Flex
          alignItems="flex-end"
          gap="medium"
        >
          {/* <TabList
          gap="xxsmall"
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey,
            onSelectionChange: setSelectedKey,
          }}
        >
          {directory.map(({ label, key }) => (
            <SubTab
              key={key}
              textValue={label}
            >
              {label}
            </SubTab>
          ))}
        </TabList> */}
          {/* Invites are only available when not using login with Plural. */}
          {configuration && !configuration?.pluralLogin && <UserInvite />}
        </Flex>
      )}
    >
      <TabPanel
        as={(
          <Flex
            direction="column"
            height="100%"
          />
        )}
        stateRef={tabStateRef}
      >
        {/* {selectedKey === 'Invites' && <Invites />} Add it once API will be ready. */}
        {selectedKey === 'Users' && <UserList />}
      </TabPanel>
    </ScrollablePage>
  )
}
