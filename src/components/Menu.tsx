import { Menu as HonorableMenu } from 'honorable'
import type { MenuProps as HonorableMenuProps } from 'honorable'
import { type MutableRefObject, forwardRef } from 'react'

export type MenuProps = HonorableMenuProps

function MenuRef({ ...props }: MenuProps, ref: MutableRefObject<any>) {
  return (
    <HonorableMenu
      ref={ref}
      {...props}
    />
  )
}

const Menu = forwardRef(MenuRef)

export default Menu
