import { Box, BoxExtendedProps } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'

type MenuItemProps = BoxExtendedProps

const propTypes = {}

const Item = styled(Box)`
  font-size: ${({ theme }) => theme.text.small.size};
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => normalizeColor(theme.global.colors['background-light'], theme)};
    font-weight: bold;
  }
`

function MenuItem(props: MenuItemProps) {
  return (
    <Item
      pad={{ vertical: '12px', horizontal: '16px' }}
      {...props}
    />
  )
}

MenuItem.propTypes = propTypes

export default MenuItem
