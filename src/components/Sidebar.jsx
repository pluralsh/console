import { useState } from 'react'
import { Box, Text } from 'grommet'
import styled from 'styled-components'
import { normalizeColor } from 'grommet/utils'

import Avatar from './Avatar'
import CollapseIcon from './icons/CollapseIcon'

const Container = styled(Box)`
  transition: width 150ms ease;
`

const Item = styled(Box)`
  width: 100%;
  height: 40px;
  border-radius: 4px;
  padding-left: 12px;
  color: ${({ theme }) => normalizeColor('text-xweak', theme)};
  cursor: pointer;

  #sidebar-items:not(:focus-within):not(:hover) > &#active-item,
  &:hover {
    color: ${({ theme }) => normalizeColor('text-strong', theme)};
    background-color: ${({ theme }) => normalizeColor('background-light', theme)};
    font-weight: 600;
  }

  transition: all 150ms linear;

  & * {
    transition: all 150ms linear;
  }
`

const ItemLabel = styled(Text)`
  margin-left: 16px;
`

const CollapseIconContainer = styled(Box)`
  cursor: pointer;
`

function Sidebar({ items, activeItemName, user }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Container
      width={`${collapsed ? 72 : 208}px`}
      background="background-front"
      border={{
        color: 'border',
        size: 'small',
        side: 'right',
      }}
      pad="24px 16px 16px 16px"
    >
      <div id="sidebar-items">
        {items.map(({ name, Icon }) => (
          <Item
            id={activeItemName === name ? 'active-item' : ''}
            active={activeItemName === name}
            key={name}
            direction="row"
            align="center"
          >
            <Icon
              size={14}
              color={activeItemName === name ? 'text-strong' : 'text-xweak'}
            />
            <ItemLabel size="small">
              {name}
            </ItemLabel>
          </Item>
        ))}
      </div>
      <Box flex="grow" />
      <Box
        direction="row"
        align="center"
      >
        <CollapseIconContainer
          background="background-light"
          round="full"
          align="center"
          justify="center"
          width="24px"
          height="24px"
        >
          <CollapseIcon
            color="text-xweak"
            size={6}
          />
        </CollapseIconContainer>
        <Text
          size="small"
          color="text-xweak"
          margin={{ left: '16px' }}
        >
          Collapse
        </Text>
      </Box>
      <Box
        direction="row"
        align="center"
        margin={{ top: '16px' }}
      >
        <Avatar
          name={user.name}
          imageUrl={user.imageUrl}
        />
        <Box pad={{ left: '8px' }}>
          <Text
            truncate
            as="div"
            weight="bold"
            color="text-xweak"
          >
            {user.name}
          </Text>
          <Text
            truncate
            as="div"
            size="small"
            color="text-xweak"
          >
            {user.email}
          </Text>
        </Box>
      </Box>
    </Container>
  )
}

export default Sidebar
