import { Box, BoxExtendedProps } from 'grommet'
import styled from 'styled-components'

type MenuProps = BoxExtendedProps

const propTypes = {}

const Container = styled(Box)`
  border-radius: 4px;
  overflow: hidden;
`

function Menu(props: MenuProps) {
  return (
    <Container
      direction="column"
      justify="stretch"
      background="background-contrast"
      {...props}
    />
  )
}

Menu.propTypes = propTypes

export default Menu
