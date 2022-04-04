import { useState } from 'react'

import Sidebar from './Sidebar'
import ScrollIcon from './icons/ScrollIcon'

export default {
  title: 'Sidebar',
  component: Sidebar,
}

function Template(args) {
  const { items } = args
  const [activeUrl, setActiveUrl] = useState(items[0].url)

  return (
    <Sidebar
      {...args}
      activeUrl={activeUrl}
      onItemClick={setActiveUrl}
    />
  )
}

function generateUrl() {
  return `/${Math.random()}`
}

export const Default = Template.bind({})

Default.args = {
  items: [
    {
      name: 'Explore',
      Icon: ScrollIcon,
      url: generateUrl(),
    },
    {
      name: 'Installed',
      Icon: ScrollIcon,
      url: generateUrl(),
    },
    {
      name: 'Users',
      Icon: ScrollIcon,
      url: generateUrl(),
      items: [
        {
          name: 'User Attributes',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Password',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Installations',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Access Tokens',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Public Keys',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Eab Credentials',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Logout',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
      ],
    },
    {
      name: 'Accounts',
      Icon: ScrollIcon,
      url: generateUrl(),
      items: [
        {
          name: 'Accounts',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Accounts',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Accounts',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
      ],
    },
    {
      name: 'Upgrades',
      Icon: ScrollIcon,
      url: generateUrl(),
    },
    {
      name: 'Incidents',
      Icon: ScrollIcon,
      url: generateUrl(),
      items: [
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Incidents',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
      ],
    },
    {
      name: 'Integrations',
      Icon: ScrollIcon,
      url: generateUrl(),
    },
    {
      name: 'Audits',
      Icon: ScrollIcon,
      url: generateUrl(),
      items: [
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
        {
          name: 'Audits',
          Icon: ScrollIcon,
          url: generateUrl(),
        },
      ],
    },
  ],
  user: {
    name: 'Jane Smith',
    email: 'jane.smith@plural.sh',
  },
}
