import { Div, DivProps } from 'honorable'

type MenuProps = DivProps

const propTypes = {}

function Menu(props: MenuProps) {
  return (
    <Div
      flex="y2s"
      borderRadius={4}
      overflow="hidden"
      backgroundColor="background-contrast"
      {...props}
    />
  )
}

Menu.propTypes = propTypes

export default Menu
