import { Flex } from 'honorable'
import { Box } from 'grommet'
import { PageTitle, TabPanel } from '@pluralsh/design-system'
import { useContext, useRef, useState } from 'react'

import { LoginContext } from 'components/contexts'

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
            {DIRECTORY.map(({ label, key }) => (
              <SubTab
                key={key}
                textValue={label}
              >
                {label}
              </SubTab>
            ))}
          </TabList> */}
          {/* Invites are only available when not using login with Plural. */}
          {configuration && !configuration?.pluralLogin && <InviteUser />}
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
