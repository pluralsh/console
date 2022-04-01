import { useState } from 'react'
import { Box, Text } from 'grommet'
import styled from 'styled-components'
import { normalizeColor } from 'grommet/utils'

const Container = styled(Box)`
  width: ${({ collapsed }) => collapsed ? 72 : 208}px;
  padding: 24px 16px 0px 16px;
`

const Item = styled(Box)`
  height: 40px;
  border-radius: 4px;
  padding-left: 12px;
  color: ${({ active, theme }) => normalizeColor(active ? 'text-strong' : 'text-xweak', theme)};
  background-color: ${(({ active, theme }) => normalizeColor(active ? 'background-light' : 'transparent', theme))};
  font-weight: ${({ active }) => active ? 'bold' : 'inherit'};
  cursor: pointer;
  transition: all 150ms ease;
`

const ItemLabel = styled(Text)`
  margin-left: 16px;
`

function Sidebar({ items, activeItemName, bottomElement }) {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedItemName, setSelectedItemName] = useState(activeItemName)

  function handleItemHoverIn(name) {
    setSelectedItemName(name)
  }

  function handleItemHoverOut() {
    setSelectedItemName(activeItemName)
  }

  return (
    <Container
      collapsed={collapsed}
      background="background-front"
      border={{
        color: 'border',
        size: 'small',
        side: 'right',
      }}
    >
      <div
        onMouseLeave={handleItemHoverOut}
        onBlur={handleItemHoverOut}
      >
        {items.map(({ name, Icon }) => (
          <Item
            active={selectedItemName === name}
            key={name}
            direction="row"
            align="center"
            onMouseEnter={() => handleItemHoverIn(name)}
          >
            <Icon
              size={14}
              color={selectedItemName === name ? 'text-strong' : 'text-xweak'}
            />
            <ItemLabel size="small">
              {name}
            </ItemLabel>
          </Item>
        ))}
      </div>
    </Container>
  )
}

export default Sidebar
