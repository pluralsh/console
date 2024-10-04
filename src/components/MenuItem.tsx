import { MenuItem as HonorableMenuItem } from 'honorable'
import type { MenuItemProps as HonorableMenuItemProps } from 'honorable'
import { type MutableRefObject, forwardRef } from 'react'

export type MenuItemProps = HonorableMenuItemProps

function MenuItemRef({ ...props }: MenuItemProps, ref: MutableRefObject<any>) {
  return (
    <HonorableMenuItem
      ref={ref}
      {...props}
    />
  )
}

const MenuItem = forwardRef(MenuItemRef)

export default MenuItem
