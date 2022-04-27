import { ReactNode } from 'react'

import { Div } from 'honorable'

type MenuItemProps = typeof Div & {
  children: ReactNode
}

const propTypes = {}

// TODO use honorable's MenuItem
function MenuItem(props: MenuItemProps) {
  return (
    <Div
      px={1}
      py={0.75}
      cursor="pointer"
      {...{
        '&:hover': {
          backgroundColor: 'background-light',
          fontWeight: 'bold',
        },
      }}
      {...props}
    />
  )
}

MenuItem.propTypes = propTypes

export default MenuItem
