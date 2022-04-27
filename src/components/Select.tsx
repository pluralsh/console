import { ReactNode } from 'react'
import { Select as HonorableSelect, SelectProps as HonorableSelectProps, MenuItem } from 'honorable'

type SelectProps = HonorableSelectProps & {
  items: Array<{ label: ReactNode, value: any }>
}

function Select({ items, ...props }: SelectProps) {
  return (
    <HonorableSelect
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
