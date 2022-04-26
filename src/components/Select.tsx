import { ReactNode } from 'react'
import { Select as HonorableSelect } from 'honorable'

import MenuItem from './MenuItem'

type SelectProps = typeof Select & {
  items: Array<{ label: ReactNode, value: any }>
}

function Select({ items, ...props }: SelectProps) {
  return (
    <HonorableSelect
      backgroundColor="background-contrast"
      {...props}
    >
      {items.map(({ value, label }) => (
        <MenuItem key={value}>
          {label}
        </MenuItem>
      ))}
    </HonorableSelect>
  )
}
export default Select
