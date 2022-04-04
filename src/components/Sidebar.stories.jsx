import { useState } from 'react'

import Sidebar from './Sidebar'
import ScrollIcon from './icons/ScrollIcon'

export default {
  title: 'Sidebar',
  component: Sidebar,
}

function Template(args) {
  const { items, activeItemName: initialActiveItemName } = args
  const [activeItemName, setActiveItemName] = useState(initialActiveItemName || items[0].name)

  return (
    <Sidebar
      {...args}
      activeItemName={activeItemName}
      onItemClick={setActiveItemName}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  items: [
    {
      name: 'Explore',
      Icon: ScrollIcon,
    },
    {
      name: 'Installed',
      Icon: ScrollIcon,
    },
    {
      name: 'Users',
      Icon: ScrollIcon,
      items: [
        {
          name: 'User Attributes',
          Icon: ScrollIcon,
        },
        {
          name: 'Password',
          Icon: ScrollIcon,
        },
        {
          name: 'Installations',
          Icon: ScrollIcon,
        },
        {
          name: 'Access Tokens',
          Icon: ScrollIcon,
        },
        {
          name: 'Public Keys',
          Icon: ScrollIcon,
        },
        {
          name: 'Eab Credentials',
          Icon: ScrollIcon,
        },
        {
          name: 'Logout',
          Icon: ScrollIcon,
        },
      ],
    },
    {
      name: 'Accounts',
      Icon: ScrollIcon,
      items: [
        {
          name: 'Accounts',
          Icon: ScrollIcon,
        },
        {
          name: 'Accounts',
          Icon: ScrollIcon,
        },
        {
          name: 'Accounts',
          Icon: ScrollIcon,
        },
      ],
    },
    {
      name: 'Upgrades',
      Icon: ScrollIcon,
    },
    {
      name: 'Incidents',
      Icon: ScrollIcon,
      items: [
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
        },
      ],
    },
    {
      name: 'Integrations',
      Icon: ScrollIcon,
    },
    {
      name: 'Audits',
      Icon: ScrollIcon,
      items: [
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
        },
      ],
    },
  ],
  activeItemName: 'Explore',
  user: {
    name: 'Jane Smith',
    email: 'jane.smith@plural.sh',
  },
}
