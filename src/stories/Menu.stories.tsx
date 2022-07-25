import {
  Flex, H3, Menu, MenuItem,
} from 'honorable'

import PersonIcon from '../components/icons/PersonIcon'

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
    <Flex
      gap={16}
      direction="column"
    >
      <H3>Default</H3>
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

      <H3>With Icon</H3>
      <Menu
        {...args}
        style={{ width: 256 }}
      >
        {items.map(item => (
          <MenuItem
            key={item}
          >
            <Flex gap={8}>
              <PersonIcon /> {item}
            </Flex>
          </MenuItem>
        ))}
      </Menu>

      <H3>Scrollable</H3>
      <Menu
        {...args}
        style={{ width: 256, maxHeight: 140, overflow: 'auto' }}
      >
        {items.map(item => (
          <MenuItem
            key={item}
          >
            <Flex gap={8}>
              <PersonIcon /> {item}
            </Flex>
          </MenuItem>
        ))}
      </Menu>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {}
