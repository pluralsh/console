import Sidebar from './Sidebar'
import ScrollIcon from './icons/ScrollIcon'

export default {
  title: 'Sidebar',
  component: Sidebar,
}

function Template(args) {
  return (
    <Sidebar
      {...args}
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
    },
    {
      name: 'Accounts',
      Icon: ScrollIcon,
    },
    {
      name: 'Upgrades',
      Icon: ScrollIcon,
    },
    {
      name: 'Incidents',
      Icon: ScrollIcon,
    },
    {
      name: 'Integrations',
      Icon: ScrollIcon,
    },
    {
      name: 'Audits',
      Icon: ScrollIcon,
    },
  ],
  activeItemName: 'Explore',
  user: {
    name: 'Jane Smith',
    email: 'jane.smith@plural.sh',
  },
}
