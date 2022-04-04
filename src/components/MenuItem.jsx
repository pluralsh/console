import { Box } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'

const Item = styled(Box)`
  font-size: ${({ theme }) => theme.text.small.size};
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => normalizeColor(theme.global.colors['background-light'], theme)};
    font-weight: bold;
  }
`

function MenuItem(props) {
  return (
    <Item
      pad={{ vertical: '12px', horizontal: '16px' }}
      {...props}
    />
  )
}

MenuItem.propTypes = Box.propTypes
MenuItem.defaultProps = Box.defaultProps

export default MenuItem
