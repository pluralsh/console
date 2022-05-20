import { useMemo, useState } from 'react'
import { Flex } from 'honorable'

import Sidebar from './Sidebar'
import ScrollIcon from './icons/ScrollIcon'

export default {
  title: 'Sidebar',
  component: Sidebar,
}

function Template(args: any) {
  const [activeUrl, setActiveUrl] = useState('/')

  function createItem(item: any) {
    const url = `/${item.name + Math.random()}`

    return {
      url,
      onClick: () => setActiveUrl(url),
      ...item,
    }
  }

  const items = useMemo(() => [
    createItem({
      name: 'Explore',
      Icon: ScrollIcon,
      url: '/',
      matchedUrl: /\/explore\S*/i,
    }),
    createItem({
      name: 'Installed',
      Icon: ScrollIcon,
    }),
    createItem({
      name: 'Users',
      Icon: ScrollIcon,
      items: [
        createItem({
          name: 'User Attributes',
          Icon: ScrollIcon,
          url: '/user-attributes',
        }),
        createItem({
          name: 'Password',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Installations',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Access Tokens',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Public Keys',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Eab Credentials',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Logout',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Log back as some long long long name',
          Icon: ScrollIcon,
        }),
      ],
    }),
    createItem({
      name: 'Accounts',
      Icon: ScrollIcon,
      items: [
        createItem({
          name: 'Accounts',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Accounts',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Accounts',
          Icon: ScrollIcon,
        }),
      ],
    }),
    createItem({
      name: 'Upgrades',
      Icon: ScrollIcon,
    }),
    createItem({
      name: 'Incidents',
      Icon: ScrollIcon,
      items: [
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Incidents',
          Icon: ScrollIcon,
        }),
      ],
    }),
    createItem({
      name: 'Integrations',
      Icon: ScrollIcon,
    }),
    createItem({
      name: 'Audits',
      Icon: ScrollIcon,
      items: [
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
        createItem({
          name: 'Audits',
          Icon: ScrollIcon,
        }),
      ],
    }),
  ], [])

  return (
    <Flex
      align="flex-start"
      height="100%"
    >
      <Sidebar
        {...args}
        items={items}
        activeUrl={activeUrl}
        onItemClick={setActiveUrl}
      />
      <Flex
        p={2}
        direction="column"
      >
        {activeUrl}
        <button
          type="button"
          style={{ marginTop: '1rem' }}
          onClick={() => setActiveUrl('/explore')}
        >
          Go to /explore
        </button>
        <button
          type="button"
          style={{ marginTop: '1rem' }}
          onClick={() => setActiveUrl('/explore/public')}
        >
          Go to /explore/public
        </button>
        <button
          type="button"
          style={{ marginTop: '1rem' }}
          onClick={() => setActiveUrl('/user-attributes')}
        >
          Go to /user-attributes
        </button>
      </Flex>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
  userName: 'Jane Smith',
  userOrganization: 'Plural',
  onUserClick: () => window.alert('User clicked'),
  onNotificationsClick: () => window.alert('Notifications clicked'),
  onUpdateClick: () => window.alert('Update clicked'),
  notificationsCount: 8,
  hasUpdate: true,
}

export const NoOrganization = Template.bind({})

NoOrganization.args = {
  userName: 'Jane Smith',
}
