import Menu from './Menu'
import MenuItem from './MenuItem'

export default {
  title: 'Menu',
  component: Menu,
}

const items = [
  'Pizza',
  'Couscous',
  'Dim Sum',
  'Ratatoulle',
  'Sushi',
]

function Template(args) {
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
