import { useState } from 'react'
import { Box } from 'grommet'
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
  font-size: 14px;
  font-weight: ${({ active }) => active ? 'bold' : 'inherit'};
`

function Sidebar({ items, activeItemName, bottomElement }) {
  const [collapsed, setCollapsed] = useState(false)

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
      {items.map(({ name, icon }) => (
        <Item
          active={activeItemName === name}
          key={name}
          direction="row"
          align="center"
        >
          {name}
        </Item>
      ))}
    </Container>
  )
}

export default Sidebar
