import { Flex } from 'honorable'
import { Box } from 'grommet'
import { PageTitle, TabPanel } from '@pluralsh/design-system'
import { useRef, useState } from 'react'

import { InviteUser } from './InviteUser'
import { UsersList } from './UsersList'

// const DIRECTORY = [
//   {
//     key: 'Users',
//     label: 'Users',
//   },
//   {
//     key: 'Invites',
//     label: 'Invites',
//   },
// ]

function getContent(selectedKey: string): JSX.Element | null {
  switch (selectedKey) {
  case 'Invites':
    return null // Add list of invites once API will be ready.
  case 'Users':
  default:
    return <UsersList />
  }
}

export function Users() {
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
            {DIRECTORY.map(({ label, key }) => (
              <SubTab
                key={key}
                textValue={label}
              >
                {label}
              </SubTab>
            ))}
          </TabList> */}
          <InviteUser />
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
        {getContent(selectedKey)}
      </TabPanel>
    </Flex>
  )
}
