import Sidebar from './Sidebar'

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
      icon: null,
    },
    {
      name: 'Installed',
      icon: null,
    },
    {
      name: 'Users',
      icon: null,
    },
    {
      name: 'Accounts',
      icon: null,
    },
    {
      name: 'Upgrades',
      icon: null,
    },
    {
      name: 'Incidents',
      icon: null,
    },
    {
      name: 'Integrations',
      icon: null,
    },
    {
      name: 'Audits',
      icon: null,
    },
  ],
  activeItemName: 'Explore',
}
