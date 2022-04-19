import { useMemo, useState } from 'react'
import { Box } from 'grommet'

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
    <Box direction="row">
      <Sidebar
        {...args}
        items={items}
        activeUrl={activeUrl}
        onItemClick={setActiveUrl}
      />
      <Box pad="large">
        {activeUrl}
      </Box>
    </Box>
  )
}

export const Default = Template.bind({})

Default.args = {
  user: {
    name: 'Jane Smith',
    email: 'jane.smith@plural.sh',
  },
}
