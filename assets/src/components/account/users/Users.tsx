import { Flex } from 'honorable'
import { Box } from 'grommet'
import { PageTitle, TabPanel } from '@pluralsh/design-system'
import { useContext, useRef, useState } from 'react'

import { LoginContext } from 'components/contexts'

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
    <Flex
      flexGrow={1}
      flexDirection="column"
      maxHeight="100%"
    >
      <PageTitle heading="Users">
        <Flex
          alignItems="flex-end"
          gap="medium"
        >
          {/* <TabList
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
      </PageTitle>
      <TabPanel
        as={(
          <Box
            fill
            gap="medium"
          />
        )}
        stateRef={tabStateRef}
      >
        {/* {selectedKey === 'Invites' && <Invites />} Add it once API will be ready. */}
        {selectedKey === 'Users' && <UserList />}
      </TabPanel>
    </Flex>
  )
}
