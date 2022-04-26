import { Div } from 'honorable'

type MenuProps = typeof Div

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
