import { Menu, MenuItem } from 'honorable'

export default {
  title: 'Menu',
  component: Menu,
}

const items = [
  'Ratatouille',
  'Pizza',
  'Sushi',
  'Couscous',
  'Dim Sum',
]

function Template(args: any) {
  return (
    <Menu
      {...args}
      style={{ width: 256 }}
    >
      {items.map(item => (
        <MenuItem key={item}>
          {item}
        </MenuItem>
      ))}
    </Menu>
  )
}

export const Default = Template.bind({})

Default.args = {
}
