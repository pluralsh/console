import { Menu as HonorableMenu } from 'honorable'
import type { MenuProps as HonorableMenuProps } from 'honorable'

export type MenuProps = HonorableMenuProps

function Menu({ ...props }: MenuProps) {
  return <HonorableMenu {...props} />
}

export default Menu
