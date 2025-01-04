import { MenuItem as HonorableMenuItem } from 'honorable'
import type { MenuItemProps as HonorableMenuItemProps } from 'honorable'

export type MenuItemProps = HonorableMenuItemProps

function MenuItem({ ...props }: MenuItemProps) {
  return <HonorableMenuItem {...props} />
}

export default MenuItem
